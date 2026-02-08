from escpos.printer import Usb, Dummy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import usb.core
import usb.util
import logging
import os
from PIL import Image
from datetime import datetime
from pathlib import Path
from escpos.constants import GS
import six

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

PRINTER_TYPE = "USB"

BASE_DIR = Path(__file__).resolve().parent
LOGO_PATH = BASE_DIR / "Images" / "GURUKRUPA_H_A_M_RS_CROP_560_238.png"

USB_PRINTER_ARGS = {
    "idVendor": 0x0483,
    "idProduct": 0x5720,
    "in_ep": 0x82,
    "out_ep": 0x03,
    "timeout": 0,
}

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

def _print_table_row(printer, label, value, width_label=12, width_value=34):
    label_field = f"{label.rstrip(':')} "
    label_padded = f"{label_field:<{width_label}}"
    value = f": {value}"
    display_value = str(value)[:width_value]
    line = f"{label_padded}{display_value}\n"
    printer.text(line)

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

def _print_wrapped_row(printer, label, value, width_label=15, total_width=48):
    import textwrap

    label_text = f"{label.rstrip(':')}"
    value = f": {value}"
    indent_length = len(label_text)

    wrapped_lines = textwrap.fill(
        str(value),
        width=total_width,
        initial_indent=label_text + " ",
        subsequent_indent=" " * (indent_length + 1)
    )

    printer.text(wrapped_lines + "\n")

def do_print_receipt(entry: dict, copies: int):
    num_copies = max(int(copies), 1)

    try:
        with PrinterContextManager() as printer:
            if hasattr(printer, "hw"):
                printer.hw("init")

            date_raw = entry.get("TransactionDate", "") or ""
            date_str = ""
            time_str = ""
            if date_raw:
                try:
                    dt_object = datetime.strptime(date_raw, "%Y-%m-%dT%H:%M:%S.%f")
                    date_str = dt_object.strftime("%d-%m-%Y")
                    time_str = dt_object.strftime("%H:%M")
                except ValueError:
                    try:
                        # Try without microseconds
                        dt_object = datetime.strptime(date_raw, "%Y-%m-%dT%H:%M:%S")
                        date_str = dt_object.strftime("%d-%m-%Y")
                        time_str = dt_object.strftime("%H:%M")
                    except ValueError as e:
                        logging.error(f"Error parsing date format: {e}")

            customer_name = entry.get("CustomerName", "") or ""
            customer_mobile = entry.get("CustomerMobile", "") or ""
            transaction_id = entry.get("TransactionID", "") or ""
            
            # Handle multi-item structure
            items = entry.get("items", [])
            if not items:
                # Fallback for legacy single-item structure
                items = [{
                    "SampleWeight": entry.get("SampleWeight"),
                    "SampleType": entry.get("SampleType", ""),
                    "TouchValue": entry.get("TouchValue"),
                    "Remark": entry.get("Remark", "")
                }]

            for _ in range(num_copies):
                # Logo
                try:
                    printer.set(align="center")
                    printer.image(LOGO_PATH)
                except FileNotFoundError:
                    logging.warning("Logo file not found. Skipping image print.")
                except Exception as e:
                    logging.error(f"Failed to print image: {e}")

                # Header
                printer.text("-" * 48 + "\n")
                printer.set(align="center", bold=True, width=2, height=2)
                printer.text("TUNCH RECEIPT\n")
                printer.set(align="center", bold=False, width=1, height=1)
                printer.text("-" * 48 + "\n")

                # Combined line: Receipt No (left) and Date/Time (right)
                printer.set(align="left", bold=False)

                left_text = f"Receipt No: {transaction_id}" if transaction_id else ""
                right_text = ""
                if date_str or time_str:
                    dt_display = " ".join(x for x in [date_str, time_str] if x)
                    right_text = f"Date: {dt_display}"

                if left_text or right_text:
                    _print_two_cols(printer, left_text, right_text, total_width=48)

                printer.text("-" * 48 + "\n")

                # Customer details
                if customer_name:
                    _print_table_row(printer, "Name", customer_name)
                if customer_mobile:
                    _print_table_row(printer, "Mobile", customer_mobile)
                
                printer.text("-" * 48 + "\n")
                
                # Print all items
                for idx, item in enumerate(items, 1):
                    sample_type = item.get("SampleType", "") or ""
                    weight_str = _fmt_decimal(item.get("SampleWeight"), 3)
                    touch_str = _fmt_decimal(item.get("TouchValue"), 2)
                    remark = item.get("Remark", "") or ""
                    
                    # Item header (only show item number if multiple items)
                    if len(items) > 1:
                        printer.set(bold=True)
                        printer.text(f"Item {idx}:\n")
                        printer.set(bold=False)
                    
                    if sample_type:
                        _print_table_row(printer, "Sample", sample_type)
                    if weight_str:
                        _print_table_row(printer, "Weight", weight_str + " gm")
                    if touch_str and Decimal(touch_str) != Decimal("0"):
                        printer.set(bold=True)
                        _print_table_row(printer, "Tunch", touch_str + " %")
                        printer.set(bold=False)
                    if remark:
                        _print_wrapped_row(printer, "Remark", remark, width_label=15)
                    
                    # Separator between items (except last)
                    if len(items) > 1 and idx < len(items):
                        printer.text("- - - - - - - - - - - - - - - - - - - - - - - -\n")

                printer.text("-" * 48 + "\n")

                # Footer – no newline after last line
                printer.set(align="center", bold=False)
                printer.text("Note: Deviation in result may be ± 0.20%\n")
                printer.set(align="center", bold=True)
                printer.text("Thank you...Visit Again..!")
                printer.cut()

                # printer.cut(mode="FULL", feed=False)
                # Fallback:
                # printer._raw(GS + b"V" + six.int2byte(66) + b"\x00")

        return {
            "status": "success",
            "msg": f"{num_copies} receipt(s) processed ({PRINTER_TYPE.lower()})",
        }

    except (ConnectionError, ValueError, usb.core.USBError) as e:
        logging.error(f"Printer operation failed: {e}")
        return {"status": "error", "message": f"Printer Error: {e}"}
    except Exception as e:
        logging.exception(f"An unexpected error occurred: {e}")
        return {"status": "error", "message": f"An unexpected error occurred: {e}"}
