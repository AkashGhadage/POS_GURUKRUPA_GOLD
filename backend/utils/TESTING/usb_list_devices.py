# usb_printer_inspect_all.py
import usb.core
import usb.util

def list_usb_devices():
    devices = list(usb.core.find(find_all=True))
    if not devices:
        print("No USB devices found.")
        return []

    print("=== CONNECTED USB DEVICES ===")
    for dev in devices:
        vid = dev.idVendor
        pid = dev.idProduct
        print(f"Device: VendorID=0x{vid:04x}, ProductID=0x{pid:04x}")
        print(f"  Bus={getattr(dev, 'bus', '?')}, Address={getattr(dev, 'address', '?')}")
        print()
    return devices

def inspect_printer_device(dev):
    vid = dev.idVendor
    pid = dev.idProduct

    try:
        dev.set_configuration()
        cfg = dev.get_active_configuration()
    except Exception as e:
        print(f"Cannot set configuration for 0x{vid:04x}:0x{pid:04x} -> {e}")
        return

    print(f"\n=== DETAILS FOR 0x{vid:04x}:0x{pid:04x} ===")
    best_out = None
    best_in = None

    for intf in cfg:
        print(f"Interface {intf.bInterfaceNumber}, alt {intf.bAlternateSetting}")
        for ep in intf:
            addr = ep.bEndpointAddress
            direction = "IN" if usb.util.endpoint_direction(addr) == usb.util.ENDPOINT_IN else "OUT"
            transfer = ep.bmAttributes & 0x3  # 0=Control,1=Iso,2=Bulk,3=Interrupt
            tname = {0: "CONTROL", 1: "ISO", 2: "BULK", 3: "INT"}[transfer]
            print(f"  Endpoint 0x{addr:02X}: {direction}, {tname}")

            if tname == "BULK":
                if direction == "OUT" and best_out is None:
                    best_out = addr
                if direction == "IN" and best_in is None:
                    best_in = addr

    print("\n--- python-escpos USB CONFIG SUGGESTION ---")
    print("PRINTER_ARGS = {")
    print(f"    'idVendor':  0x{vid:04x},")
    print(f"    'idProduct': 0x{pid:04x},")
    if best_in is not None:
        print(f"    'in_ep':     0x{best_in:02X},  # BULK IN")
    else:
        print("    'in_ep':     0x82,       # adjust if needed (no BULK IN detected)")
    if best_out is not None:
        print(f"    'out_ep':    0x{best_out:02X},  # BULK OUT")
    else:
        print("    'out_ep':    0x01,       # adjust if needed (no BULK OUT detected)")
    print("    'timeout':   0,")
    print("}\n")

if __name__ == "__main__":
    devices = list_usb_devices()
    for dev in devices:
        inspect_printer_device(dev)
