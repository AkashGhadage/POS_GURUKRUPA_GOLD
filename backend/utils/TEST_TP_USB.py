from escpos.printer import Usb, Network, Dummy, Serial
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


# ---------------------------------------------------------------------
# Printer configuration
# ---------------------------------------------------------------------

# Use "DUMMY" for testing, "USB", "NETWORK", or "SERIAL" for real printer
PRINTER_TYPE = "DUMMY"

# Adjust this dict depending on which PRINTER_TYPE you actually use.
PRINTER_ARGS = {
    # For SERIAL (Bluetooth as COM port on Windows, e.g. COM3/COM4)
    "devfile": "COM3",
    "baudrate": 9600,
    "timeout": 1,

    # For USB (uncomment and fill when using USB printer)
    "idVendor": 0x1234,
    "idProduct": 0x5678,
    # "usb_interface": 0,
    # "in_ep": 0x82,
    # "out_ep": 0x01,

    # For Network (uncomment and fill when using LAN printer)
    # "host": "192.168.1.31",
    # "port": 9100,
}


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _fmt_decimal(value, places):
    """
    Convert a numeric value to a string with fixed decimal places,
    avoiding scientific notation (e.g. 3e-06 => 0.000003).
    Returns '' if the value is missing/invalid.
    """
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return ""
    step = Decimal("1").scaleb(-places)  # 3 -> 0.001, 2 -> 0.01
    return str(d.quantize(step, rounding=ROUND_HALF_UP))


def get_printer():
    """
    Returns an escpos printer instance based on PRINTER_TYPE.
    DUMMY is for testing; others are for real printing.
    """
    if PRINTER_TYPE == "DUMMY":
        return Dummy()
    elif PRINTER_TYPE == "USB":
        # Ensure PRINTER_ARGS contains idVendor, idProduct, etc. for USB mode.
        return Usb(
            PRINTER_ARGS["idVendor"],
            PRINTER_ARGS["idProduct"],
            interface=PRINTER_ARGS.get("usb_interface", 0),
            in_ep=PRINTER_ARGS.get("in_ep", 0x82),
            out_ep=PRINTER_ARGS.get("out_ep", 0x01),
        )
    elif PRINTER_TYPE == "NETWORK":
        host = PRINTER_ARGS["host"]
        port = PRINTER_ARGS.get("port", 9100)
        return Network(host, port=port)
    elif PRINTER_TYPE == "SERIAL":
        return Serial(
            devfile=PRINTER_ARGS["devfile"],
            baudrate=PRINTER_ARGS.get("baudrate", 9600),
            timeout=PRINTER_ARGS.get("timeout", 1),
        )
    else:
        raise Exception(f"Unsupported printer type: {PRINTER_TYPE}")


# ---------------------------------------------------------------------
# Main receipt printing function
# ---------------------------------------------------------------------

def do_print_receipt(entry, copies):
    """
    Print a tunch receipt for the given entry dict.

    Expected keys in `entry`:
      TransactionDate: 'YYYY-MM-DDTHH:MM:SS' or similar
      TransactionID:   receipt number
      CustomerName
      CustomerMobile
      SampleType
      SampleWeight     (number, weight in gm)
      KaratValue       (number, purity)
      TouchValue       (number, touch)
      Remark           (optional)

    Returns a dict: {"status": "success", "msg": "..."} or
                    {"status": "error", "message": "..."}
    """
    # 1) Get printer instance
    try:
        printer = get_printer()
    except Exception as e:
        return {"status": "error", "message": f"Printer connection failed: {e}"}

    try:
        # 2) Normalize formatted values once
        date_raw = entry.get("TransactionDate", "") or ""
        date_str = date_raw[:10]
        time_str = date_raw[11:16]

        weight_str = _fmt_decimal(entry.get("SampleWeight"), 3)   # 3 decimals
        karat_str = _fmt_decimal(entry.get("KaratValue"), 2)      # 2 decimals
        touch_str = _fmt_decimal(entry.get("TouchValue"), 2)      # 2 decimals

        # 3) Print required number of copies
        for _ in range(max(int(copies), 1)):
            # Header
            printer.set(align="center", bold=True, height=2)
            printer.text("GuruKrupa Gold\n")

            printer.set(align="center", bold=False, height=1)
            printer.text("      Computerized Testing & Laser Soldering Services\n")
            printer.text("3175/32, BEADON PURA, KAROL BAGH, NEW DELHI, 110005\n")
            printer.text("-" * 48 + "\n")

            # Tunch Receipt section
            printer.set(align="center", bold=True, height=1)
            printer.text("                   Tunch Receipt\n")
            printer.set(align="center", bold=False, height=1)
            printer.text("-" * 48 + "\n")

            # Receipt info (date/time/receipt number)
            printer.set(align="left", bold=False, height=1)
            printer.text(f"Date:        {date_str}     Time: {time_str}\n")
            printer.text(f"Receipt No:  {entry.get('TransactionID', '')}\n")
            printer.text("-" * 48 + "\n")

            # Customer and sample details
            printer.text(f"Customer:    {entry.get('CustomerName', '')}\n")
            printer.text(f"Mobile:      {entry.get('CustomerMobile', '')}\n")
            printer.text(f"Sample Type: {entry.get('SampleType', '')}\n")
            printer.text(f"Weight:      {weight_str} gm\n")
            # printer.text(f"Purity:      {karat_str}K\n")
            printer.text(f"Tunch:       {touch_str}\n")
            if entry.get("Remark"):
                printer.text(f"Remark:      {entry.get('Remark')}\n")
            printer.text("-" * 48 + "\n")

            # Footer
            printer.set(align="center", bold=True, height=1)
            printer.text("                  Thank you!\n")
            printer.text("              Visit Again. Call:\n")
            printer.text("            9975796681, 9075516373\n")
            printer.text("-" * 48 + "\n")

            # Cut paper
            printer.cut()

        # 4) In DUMMY mode, save ESC/POS to file for inspection
        if PRINTER_TYPE == "DUMMY":
            escpos_data = printer.output  # raw ESC/POS bytes from Dummy printer
            with open("test_receipt_escpos.bin", "wb") as f:
                f.write(escpos_data)
            print("Generated dummy ESC/POS receipt, text preview:")
            print(printer.output)

        return {
            "status": "success",
            "msg": f"{copies} copies processed ({PRINTER_TYPE.lower()})",
        }

    except Exception as e:
        print(f"Error during printing: {e}")

        return {"status": "error", "message": f"Print failed: {e}"}


# def test_print_receipt():
#     """
#     Local test helper.
#     Run this file directly to print a sample receipt
#     (or generate dummy ESC/POS output when PRINTER_TYPE = 'DUMMY').
#     """
#     sample_entry = {
#         "TransactionID": 13,
#         "TransactionDate": "2025-11-15T17:40:10.203873",
#         "TestedOn": "2025-11-15T17:49:39.730470",
#         "CustomerName": "Amit Gupta",
#         "CustomerMobile": "",
#         "SampleWeight": 18.3,
#         "SampleType": "Gold",
#         "TouchValue": 85.6,
#         "KaratValue": 22,
#         "TestingMethod": "Without Print",
#         "Remark": "",
#     }
#     copies = 3
#     result = do_print_receipt(sample_entry, copies)
#     print("Print result:", result)


# if __name__ == "__main__":
#     # Run: python printer_escpos.py
#     test_print_receipt()
