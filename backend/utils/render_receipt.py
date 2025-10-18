from PIL import Image, ImageDraw, ImageFont

# Step 1: Read ESC/POS raw bytes from file
with open(r"C:\Users\Akash\pos_gurukrupa_gold\backend\test_receipt_escpos.bin", "rb") as f:
    escpos_bytes = f.read()

# Step 2: Decode ESC/POS bytes to extract only readable text lines (ignore binary commands)
text = escpos_bytes.decode('utf-8', errors='ignore')
text_lines = [line for line in text.split('\n') if line.strip()]

# Step 3: Set up receipt image parameters
font = ImageFont.load_default()
ascent, descent = font.getmetrics()
line_height = ascent + descent + 4
receipt_width = 400
receipt_height = line_height * len(text_lines) + 20

# Step 4: Create blank white image
img = Image.new("L", (receipt_width, receipt_height), color=255)
draw = ImageDraw.Draw(img)

# Step 5: Draw each text line in receipt format
y = 10
for line in text_lines:
    draw.text((10, y), line, font=font, fill=0)
    y += line_height

# Step 6: Save image
img.save("receipt_rendered.png")
print("Rendered receipt saved as receipt_rendered.png")
