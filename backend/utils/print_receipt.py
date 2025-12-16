from escpos.printer import Usb, Dummy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import usb.core
import usb.util
import logging
import os
from PIL import Image
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ---------------------------------------------------------------------
# ✅ PRINTER CONFIGURATION (SWITCH MODES HERE)
# ---------------------------------------------------------------------

PRINTER_TYPE = "USB"

# Manually resized logo path

BASE_DIR = Path(__file__).resolve().parent   # -> ...\backend\utils
LOGO_PATH = BASE_DIR / "Images" / "GURUKRUPA_H_A_M_RS_CROP_560.png"

USB_PRINTER_ARGS = {
    "idVendor": 0x0483,
    "idProduct": 0x5720,
    "in_ep": 0x82,
    "out_ep": 0x03,
    "timeout": 0,
}

# ---------------------------------------------------------------------
# ✅ HELPERS
# ---------------------------------------------------------------------

def _fmt_decimal(value, places):
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as e:
        logging.warning(f"Invalid decimal input: {value} - {e}")
        return ""
    step = Decimal("1").scaleb(-places)
    return str(d.quantize(step, rounding=ROUND_HALF_UP))

def _get_dummy_printer():
    logging.info("Initializing DUMMY printer (output will be saved to file).")
    return Dummy()

def _get_usb_printer_instance():
    device = usb.core.find(
        idVendor=USB_PRINTER_ARGS["idVendor"],
        idProduct=USB_PRINTER_ARGS["idProduct"]
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

class PrinterContextManager:
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
                    output_path = "test_receipt_escpos.bin"
                    with open(output_path, "wb") as f:
                        f.write(escpos_data)
                    logging.info(f"DUMMY output saved to {os.path.abspath(output_path)}")

            except Exception as e:
                logging.error(f"Error during printer close/file save operation: {e}")

# Label + colon column helper (for single-column rows)
def _print_table_row(printer, label, value, width_label=12, width_value=34):
    """
    FIXED: Ensures the colon is included and the label is consistently padded.
    """
    # Ensure the label (including colon) has a fixed width
    label_field = f"{label.rstrip(':')} " 
    label_padded = f"{label_field:<{width_label}}"
    value = f": {value}"
    display_value = str(value)[:width_value]
    line = f"{label_padded}{display_value}\n"
    printer.text(line)


# Two-column helper for Date (left) and Time (right) on same line
def _print_two_cols(printer, left_text, right_text, total_width=48):
    left = str(left_text)
    right = str(right_text)
    inner_width = total_width - 1
    if len(left) + len(right) > inner_width:
        max_right = max(0, inner_width - len(left))
        right = right[:max_right]
    spaces = inner_width - len(left) - len(right)
    line = left + (" " * spaces) + right + "\n"
    printer.text(line)

# Add this new helper function to your HELPERS section:
# _print_wrapped_row(printer, "Remark", remark, width_label=15)
                    
def _print_wrapped_row(printer, label, value, width_label=15, total_width=48):
    """
    Handles long text wrapping for fields like 'Remark'.
    Subsequent lines are indented to align under the start of the value text.
    """
    import textwrap
    
    label_text = f"{label.rstrip(':')}"
    value = f': {value}'
    # Calculate the indent for the wrapped lines (must match the length of the label text)
    indent_length = len(label_text)
    
    # Python's textwrap does the heavy lifting
    wrapped_lines = textwrap.fill(
        str(value),
        width=total_width,
        initial_indent=label_text + " ", # Starts with "Remark: "
        subsequent_indent=" " * (indent_length + 1) # Indents subsequent lines
    )
    
    printer.text(wrapped_lines + "\n")
    
# ---------------------------------------------------------------------
# ✅ MAIN PRINT FUNCTION
# ---------------------------------------------------------------------

def do_print_receipt(entry: dict, copies: int):
    num_copies = max(int(copies), 1)

    try:
        with PrinterContextManager() as printer:
            
            # Initialize hardware safely (only if method exists)
            if hasattr(printer, "hw"): 
                printer.hw("init")
                
            date_raw = entry.get("TransactionDate", "") or ""
            date_str = ""
            time_str = ""
            if date_raw:
                try:
                    # Parse the input string into a datetime object
                    dt_object = datetime.strptime(date_raw, "%Y-%m-%dT%H:%M:%S.%f")
                    
                    # Format the datetime object into the desired output strings
                    date_str = dt_object.strftime("%d-%m-%Y") # DD-MM-YYYY
                    time_str = dt_object.strftime("%H:%M")   # HH:MM
                    
                except ValueError as e:
                    logging.error(f"Error parsing date format: {e}")
            weight_str = _fmt_decimal(entry.get("SampleWeight"), 3)
            touch_str = _fmt_decimal(entry.get("TouchValue"), 2)
            karat_str = _fmt_decimal(entry.get("KaratValue"), 2)
            customer_name = entry.get('CustomerName', '') or ''
            customer_mobile = entry.get('CustomerMobile', '') or ''
            sample_type = entry.get('SampleType', '') or ''
            remark = entry.get("Remark", "") or ""
            transaction_id = entry.get('TransactionID', '') or ''

            for _ in range(num_copies):

                # Logo
                try:
                    printer.set(align="center")
                    printer.image(LOGO_PATH)
                    printer.ln()
                except FileNotFoundError:
                    logging.warning("Logo file not found. Skipping image print.")
                except Exception as e:
                    logging.error(f"Failed to print image: {e}")

                # (Text headings are commented out as per your last code version)
                printer.text("-" * 48 + "\n")

                # Tunch Receipt heading
                printer.set(align="center", bold=True, width=2, height=2)
                printer.text("TUNCH RECEIPT\n")
                printer.set(align="center", bold=False, width=1, height=1)
                printer.text("-" * 48 + "\n")

                # Receipt info: Date (left) and Time (right) on same line
                printer.set(align="left", bold=False)

                date_part = f"Date: {date_str}" if date_str else ""
                time_part = f"Time: {time_str}" if time_str else ""

                if date_part or time_part:
                    _print_two_cols(printer, date_part, time_part)

                if transaction_id:
                    printer.set(bold=True)
                    _print_table_row(printer, "Receipt No", transaction_id)
                    printer.set(bold=False)
                printer.text("-" * 48 + "\n")

                # Customer and sample details
                if customer_name:
                    _print_table_row(printer, "Name", customer_name)
                if customer_mobile:
                    _print_table_row(printer, "Mobile", customer_mobile)
                if sample_type:
                    _print_table_row(printer, "Sample", sample_type)
                if weight_str:
                    _print_table_row(printer, "Weight", weight_str + " gm")
                if touch_str and Decimal(touch_str) != Decimal('0'):
                        printer.set(bold=True)
                        _print_table_row(printer, "Tunch", touch_str + " %")
                        printer.set(bold=False)
                # if karat_str or karat_str == "0":
                #     _print_table_row(printer, "Karat", karat_str + "K")

                if remark:
                    _print_wrapped_row(printer, "Remark", remark, width_label=15)

                printer.text("-" * 48 + "\n")

                # Footer
                printer.set(align="center", bold=False)
                printer.text("Note: Deviation in result may be ± 0.20%\n")
                printer.set(align="center", bold=True)
                printer.text("Thank you...Visit Again..!\n")
                printer.cut()

        return {
            "status": "success",
            "msg": f"{num_copies} receipt(s) processed ({PRINTER_TYPE.lower()})",
        }

    except (ConnectionError, ValueError, usb.core.USBError) as e:
        logging.error(f"Printer operation failed: {e}")
        return {"status": "error", "message": f"Printer Error: {e}"}
    except Exception as e:
        logging.exception(f"An unexpected error occurred: {e}")
        return {"status": "error", "message": f"An unexpected error occurred: {e}"} # Ensure function always returns
