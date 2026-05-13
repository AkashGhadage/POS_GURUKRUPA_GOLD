"""
print_receipt_image.py
======================
Image-based receipt printer — drop-in replacement for print_receipt.py.

WHY THIS EXISTS
---------------
Thermal printers use a built-in character ROM whose glyph for "0" may be
slashed (Ø-style), causing confusion on receipts.  When text is rendered as a
bitmap image on the host PC and sent to the printer as pixel data, the printer
never looks up any glyph; it simply fires heating elements for black/white
pixels.  The result is clean, consistent text using any TrueType font you
choose.

HOW TO ACTIVATE
---------------
In backend/main.py change:
    from utils.print_receipt       import do_print_receipt
to:
    from utils.print_receipt_image import do_print_receipt

CONFIGURATION
-------------
Adjust the constants in the "Image rendering configuration" section below to
match your hardware:
  - PAPER_WIDTH_PX : 384 for 58 mm paper, 576 for 80 mm paper
  - FONT_SIZE       : body text size in pixels
  - FONT_SIZE_TITLE : size for the large "TUNCH RECEIPT" heading
  - PADDING_X       : left/right inner margin
  - LABEL_COL_PX    : pixel width reserved for the label column in detail rows
"""

from escpos.printer import Usb, Dummy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import usb.core
import usb.util
import logging
import os
import textwrap
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# ── Printer hardware configuration ────────────────────────────────────────────
PRINTER_TYPE = "USB"

BASE_DIR  = Path(__file__).resolve().parent
LOGO_PATH = BASE_DIR / "Images" / "GURUKRUPA_H_A_M_RS_CROP_560_238.png"

USB_PRINTER_ARGS = {
    "idVendor": 0x0483,
    "idProduct": 0x5720,
    "in_ep":    0x82,
    "out_ep":   0x03,
    "timeout":  0,
}

# ── Image rendering configuration ─────────────────────────────────────────────
# Change PAPER_WIDTH_PX to 576 if you use 80 mm paper.
PAPER_WIDTH_PX = 384   # pixels wide  (58 mm × 8 dots/mm = 384 px)
PADDING_X      = 8     # left & right inner margin in pixels
FONT_SIZE       = 20   # body text
FONT_SIZE_SMALL = 16   # receipt no / date-time line
FONT_SIZE_TITLE = 36   # "TUNCH RECEIPT" heading
LINE_GAP       = 6     # extra vertical padding below each text line (pixels)
SEP_THICKNESS  = 2     # separator line thickness (pixels)
SEP_PADDING    = 4     # vertical space above & below the separator line
LABEL_COL_PX   = 100   # pixels reserved for the label column in detail rows
COLON_GAP_PX  = 6     # space between colon and value
BOTTOM_FEED_PX = 16    # blank pixels printed below the last line before cut

# TrueType font search paths – first existing file is used.
# Add more paths here for Linux / Docker environments if needed.
_FONT_PATHS = {
    "regular": [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/verdana.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ],
    "bold": [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/verdanab.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ],
}


# ── Font helpers ───────────────────────────────────────────────────────────────

def _load_font(key: str, size: int) -> ImageFont.FreeTypeFont:
    """Load the first available TrueType font for *key* at *size* pixels."""
    for path in _FONT_PATHS.get(key, _FONT_PATHS["regular"]):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    logging.warning(
        "No TrueType font found for '%s' at size %d; falling back to PIL default.",
        key, size,
    )
    return ImageFont.load_default()


def _text_wh(font: ImageFont.FreeTypeFont, text: str):
    """Return (width, height) of *text* rendered with *font*.

    Compatible with both old Pillow (<9.2) and new Pillow (>=9.2).
    """
    try:
        # Pillow >= 9.2
        bbox = font.getbbox(text)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]
    except AttributeError:
        # Pillow < 9.2
        return font.getsize(text)  # type: ignore[attr-defined]


# ── Segment renderers ──────────────────────────────────────────────────────────
# Each function returns a 1-bit PIL Image of (PAPER_WIDTH_PX, auto height).
# "1" mode: 0 = black (ink), 1 = white (no ink).

def _seg_separator(paper_width: int) -> Image.Image:
    """Horizontal rule across the full paper width."""
    h = SEP_PADDING * 2 + SEP_THICKNESS
    img = Image.new("1", (paper_width, h), 1)
    draw = ImageDraw.Draw(img)
    y = SEP_PADDING
    draw.line([(0, y), (paper_width - 1, y)], fill=0, width=SEP_THICKNESS)
    return img


def _seg_text(
    text: str,
    font: ImageFont.FreeTypeFont,
    paper_width: int,
    padding_x: int,
    align: str = "left",
) -> Image.Image:
    """Single line of text, horizontally aligned."""
    inner_w = paper_width - 2 * padding_x
    tw, th = _text_wh(font, text)
    img = Image.new("1", (paper_width, th + LINE_GAP), 1)
    draw = ImageDraw.Draw(img)

    if align == "center":
        x = padding_x + max(0, (inner_w - tw) // 2)
    elif align == "right":
        x = padding_x + max(0, inner_w - tw)
    else:
        x = padding_x

    draw.text((x, 0), text, font=font, fill=0)
    return img


def _seg_two_cols(
    left_text: str,
    right_text: str,
    font: ImageFont.FreeTypeFont,
    paper_width: int,
    padding_x: int,
) -> Image.Image:
    """Left-aligned text and right-aligned text on the same line."""
    inner_w = paper_width - 2 * padding_x
    lw, lh = _text_wh(font, left_text)
    rw, rh = _text_wh(font, right_text)

    # Trim right text if combined width exceeds inner width
    while right_text and (lw + rw) > inner_w:
        right_text = right_text[:-1]
        rw, rh = _text_wh(font, right_text)

    img_h = max(lh, rh) + LINE_GAP
    img = Image.new("1", (paper_width, img_h), 1)
    draw = ImageDraw.Draw(img)
    draw.text((padding_x, 0), left_text, font=font, fill=0)
    draw.text((paper_width - padding_x - rw, 0), right_text, font=font, fill=0)
    return img


def _seg_label_value(
    label: str,
    value: str,
    font_normal: ImageFont.FreeTypeFont,
    font_bold: ImageFont.FreeTypeFont,
    paper_width: int,
    padding_x: int,
    bold_value: bool = False,
    label_col_px: int = LABEL_COL_PX,
) -> Image.Image:
    """
    Label-value row with automatic line-wrapping for long values.

    Layout (pixels):
        [padding_x] [<-- label_col_px -->] [value ...]
    """
    inner_w   = paper_width - 2 * padding_x
    value_w   = inner_w - label_col_px
    font_v    = font_bold if bold_value else font_normal

    # Estimate characters per line for the value column
    avg_cw, char_h = _text_wh(font_v, "0")
    chars_per_line = max(1, value_w // max(1, avg_cw))
    value_lines = textwrap.wrap(str(value), width=chars_per_line) or [""]

    line_h = char_h + LINE_GAP
    img_h  = line_h * len(value_lines)
    img    = Image.new("1", (paper_width, img_h), 1)
    draw   = ImageDraw.Draw(img)

    # Label left-aligned from padding_x; colon fixed at padding_x + label_col_px
    label_base = label.rstrip(":")
    colon_w, _ = _text_wh(font_normal, ":")
    draw.text((padding_x, 0), label_base, font=font_normal, fill=0)
    draw.text((padding_x + label_col_px - colon_w, 0), ":", font=font_normal, fill=0)

    # Value lines (may wrap) — start after colon + small gap
    value_x = padding_x + label_col_px + COLON_GAP_PX
    for i, line in enumerate(value_lines):
        draw.text((value_x, i * line_h), line, font=font_v, fill=0)

    return img


def _vstack(images: list) -> Image.Image:
    """Stack a list of PIL Images vertically into one tall image."""
    total_h = sum(img.height for img in images)
    max_w   = max(img.width for img in images)
    canvas  = Image.new("1", (max_w, total_h), 1)
    y = 0
    for img in images:
        canvas.paste(img, (0, y))
        y += img.height
    return canvas


# ── Receipt builder ────────────────────────────────────────────────────────────

def _build_receipt_image(entry: dict) -> Image.Image:
    """
    Assemble the complete receipt body (everything below the logo) as a single
    1-bit PIL Image.  Zeros will be clean because the printer character ROM is
    never consulted.
    """
    pw = PAPER_WIDTH_PX
    px = PADDING_X

    font_n     = _load_font("regular", FONT_SIZE)
    font_b     = _load_font("bold",    FONT_SIZE)
    font_s     = _load_font("regular", FONT_SIZE_SMALL)
    font_title = _load_font("bold",    FONT_SIZE_TITLE)

    # ── Parse entry fields ─────────────────────────────────────────────────────
    date_raw = entry.get("TransactionDate", "") or ""
    date_str = time_str = ""
    if date_raw:
        try:
            dt       = datetime.strptime(date_raw, "%Y-%m-%dT%H:%M:%S.%f")
            date_str = dt.strftime("%d-%m-%Y")
            time_str = dt.strftime("%H:%M")
        except ValueError as e:
            logging.error("Error parsing TransactionDate '%s': %s", date_raw, e)

    weight_str      = _fmt_decimal(entry.get("SampleWeight"), 3)
    touch_str       = _fmt_decimal(entry.get("TouchValue"),   2)
    customer_name   = entry.get("CustomerName",   "") or ""
    customer_mobile = entry.get("CustomerMobile", "") or ""
    sample_type     = entry.get("SampleType",     "") or ""
    remark          = entry.get("Remark",         "") or ""
    transaction_id  = entry.get("TransactionID",  "") or ""

    # ── Build segment list ─────────────────────────────────────────────────────
    segs = []

    # ── Top separator
    segs.append(_seg_separator(pw))

    # ── Title
    segs.append(_seg_text("TUNCH RECEIPT", font_title, pw, px, align="center"))

    # ── Separator
    segs.append(_seg_separator(pw))

    # ── Receipt No (left)  |  Date & Time (right)
    # Use a smaller font so both receipt no + full date+time fit on one line.
    left_col  = f"Receipt No: {transaction_id}" if transaction_id else ""
    dt_parts  = " ".join(x for x in [date_str, time_str] if x)
    right_col = f"Date: {dt_parts}" if dt_parts else ""
    if left_col or right_col:
        segs.append(_seg_two_cols(left_col, right_col, font_s, pw, px))

    # ── Separator
    segs.append(_seg_separator(pw))

    # ── Detail rows
    if customer_name:
        segs.append(_seg_label_value("Name",   customer_name,   font_n, font_b, pw, px))
    if customer_mobile:
        segs.append(_seg_label_value("Mobile", customer_mobile, font_n, font_b, pw, px))
    if sample_type:
        segs.append(_seg_label_value("Sample", sample_type,     font_n, font_b, pw, px))
    if weight_str:
        segs.append(_seg_label_value("Weight", weight_str + " gm", font_n, font_b, pw, px))
    if touch_str and Decimal(touch_str) != Decimal("0"):
        segs.append(_seg_label_value(
            "Tunch", touch_str + " %",
            font_n, font_b, pw, px,
            bold_value=True,
        ))
    if remark:
        segs.append(_seg_label_value("Remark", remark, font_n, font_b, pw, px))

    # ── Separator
    segs.append(_seg_separator(pw))

    # ── Footer
    segs.append(_seg_text(
        "Note: Deviation in result may be \u00b1 0.20%",
        font_n, pw, px, align="center",
    ))
    segs.append(_seg_text(
        "Thank you...Visit Again..!",
        font_b, pw, px, align="center",
    ))

    # ── Bottom whitespace before the cut
    segs.append(Image.new("1", (pw, BOTTOM_FEED_PX), 1))

    return _vstack(segs)


# ── Decimal formatter (identical to original) ──────────────────────────────────

def _fmt_decimal(value, places: int) -> str:
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as e:
        logging.warning("Invalid decimal input: %s - %s", value, e)
        return ""
    step = Decimal("1").scaleb(-places)
    return str(d.quantize(step, rounding=ROUND_HALF_UP))


# ── Printer context manager ────────────────────────────────────────────────────

def _get_dummy_printer():
    logging.info("Initializing DUMMY printer.")
    return Dummy()


def _get_usb_printer_instance():
    device = usb.core.find(
        idVendor=USB_PRINTER_ARGS["idVendor"],
        idProduct=USB_PRINTER_ARGS["idProduct"],
    )
    if device is None:
        raise ConnectionError(
            "USB printer not found. Check Vendor/Product ID and system permissions."
        )
    printer = Usb(
        USB_PRINTER_ARGS["idVendor"],
        USB_PRINTER_ARGS["idProduct"],
        timeout=USB_PRINTER_ARGS["timeout"],
        in_ep=USB_PRINTER_ARGS["in_ep"],
        out_ep=USB_PRINTER_ARGS["out_ep"],
    )
    printer.open()
    logging.info("USB printer connection established.")
    return printer


class _PrinterContextManager:
    def __enter__(self):
        if PRINTER_TYPE == "DUMMY":
            self.printer = _get_dummy_printer()
        elif PRINTER_TYPE == "USB":
            self.printer = _get_usb_printer_instance()
        else:
            raise ValueError(f"Unknown PRINTER_TYPE: {PRINTER_TYPE}")
        return self.printer

    def __exit__(self, exc_type, exc_value, traceback):
        if self.printer:
            try:
                if PRINTER_TYPE == "USB":
                    self.printer.close()
                    logging.info("USB printer connection closed.")
                if PRINTER_TYPE == "DUMMY" and exc_type is None:
                    escpos_data = self.printer.output
                    out_path = "test_receipt_image_escpos.bin"
                    with open(out_path, "wb") as fh:
                        fh.write(escpos_data)
                    logging.info("DUMMY output saved to %s", os.path.abspath(out_path))
            except Exception as e:
                logging.error("Error during printer cleanup: %s", e)


# ── Public API ─────────────────────────────────────────────────────────────────

def do_print_receipt(entry: dict, copies: int):
    """
    Print *copies* of a receipt for *entry*.

    Identical signature to the original print_receipt.do_print_receipt so that
    only one import line in main.py needs to change.
    """
    num_copies = max(int(copies), 1)

    try:
        receipt_img = _build_receipt_image(entry)

        with _PrinterContextManager() as printer:
            for _ in range(num_copies):
                # ── Logo (already a bitmap – no charset issue)
                try:
                    printer.set(align="center")
                    printer.image(str(LOGO_PATH))
                except FileNotFoundError:
                    logging.warning("Logo not found at %s – skipping.", LOGO_PATH)
                except Exception as e:
                    logging.error("Failed to print logo: %s", e)

                # ── Receipt body rendered as bitmap image
                # No printer character ROM is used – zeros will be clean.
                printer.set(align="left")
                printer.image(receipt_img)
                printer.cut()

        return {
            "status": "success",
            "msg": (
                f"{num_copies} receipt(s) printed "
                f"({PRINTER_TYPE.lower()}, image mode)"
            ),
        }

    except (ConnectionError, ValueError, usb.core.USBError) as e:
        logging.error("Printer operation failed: %s", e)
        return {"status": "error", "message": f"Printer Error: {e}"}
    except Exception as e:
        logging.exception("Unexpected error during printing: %s", e)
        return {"status": "error", "message": f"An unexpected error occurred: {e}"}
