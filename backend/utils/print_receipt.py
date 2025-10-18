from escpos.printer import Usb, Network, Dummy, Serial

PRINTER_TYPE = "DUMMY"  # Change to "USB", "NETWORK", or "SERIAL" for real printer
PRINTER_ARGS = {
    "devfile": "COM3",          # For SERIAL (Bluetooth as COM port)
    "baudrate": 9600,
    "timeout": 1
    # "idVendor": 0x1234,        # For USB
    # "idProduct": 0x5678,
    # "host": "192.168.1.31"     # For Network
}

def get_printer():
    if PRINTER_TYPE == "DUMMY":
        return Dummy()
    elif PRINTER_TYPE == "USB":
        return Usb(**PRINTER_ARGS)
    elif PRINTER_TYPE == "NETWORK":
        return Network(PRINTER_ARGS["host"])
    elif PRINTER_TYPE == "SERIAL":
        return Serial(devfile=PRINTER_ARGS["devfile"],
                      baudrate=PRINTER_ARGS.get("baudrate", 9600),
                      timeout=PRINTER_ARGS.get("timeout", 1))
    else:
        raise Exception("Unsupported printer type")

def do_print_receipt(entry, copies):
    try:
        printer = get_printer()
    except Exception as e:
        return {"status": "error", "message": f"Printer connection failed: {e}"}

    try:
        for _ in range(copies):
            # Header
            printer.set(align='center', bold=True, height=2)
            printer.text("GuruKrupa Gold\n")
            printer.set(align='center', bold=False, height=1)
            printer.text("      Computerized Testing & Laser Soldering Services\n")
            printer.text("3175/32, BEADON PURA, KAROL BAGH, NEW DELHI, 110005\n")
            printer.text("-" * 48 + "\n")
            
            # Tunch Receipt section (centered, bold)
            printer.set(align='center', bold=True, height=1)
            printer.text("                   Tunch Receipt\n")
            printer.set(align='center', bold=False, height=1)
            printer.text("-" * 48 + "\n")

            # Receipt info (date/time/receipt number, left aligned)
            date_str = entry.get("TransactionDate", "")[:10]
            time_str = entry.get("TransactionDate", "")[11:16]
            printer.set(align='left', bold=False, height=1)
            printer.text(f"Date:        {date_str}     Time: {time_str}\n")
            printer.text(f"Receipt No:  {entry.get('TransactionID','')}\n")
            printer.text("-" * 48 + "\n")
            
            # Customer and sample details
            printer.text(f"Customer:    {entry.get('CustomerName','')}\n")
            printer.text(f"Mobile:      {entry.get('CustomerMobile','')}\n")
            printer.text(f"Sample Type: {entry.get('SampleType','')}\n")
            printer.text(f"Weight:      {entry.get('SampleWeight','')} gm\n")
            printer.text(f"Purity:      {entry.get('KaratValue','')}K\n")
            printer.text(f"Touch:       {entry.get('TouchValue','')}\n")
            if entry.get("Remark"):
                printer.text(f"Remark:      {entry.get('Remark')}\n")
            printer.text("-" * 48 + "\n")

            # Footer
            printer.set(align='center', bold=True, height=1)
            printer.text("                  Thank you!\n")
            printer.text("              Visit Again. Call:\n")
            printer.text("             9975796681, 9075516373\n")
            printer.text("-" * 48 + "\n")

            # Cut paper
            printer.cut()
        if PRINTER_TYPE == "DUMMY":
            escpos_data = printer.output
            with open("test_receipt_escpos.bin", "wb") as f:
                f.write(escpos_data)
            print("Generated dummy ESC/POS receipt, text preview:")
            print(printer.output)
        return {"status": "success", "msg": f"{copies} copies processed ({PRINTER_TYPE.lower()})"}
    except Exception as e:
        return {"status": "error", "message": f"Print failed: {e}"}
