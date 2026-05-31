import os
from pypdf import PdfReader

pdf_path = "/Users/KRZYSZTOF/Documents/ANTIGRAVITY/NIERUCHOMOSCI_PROJECT/NIERUCHOMOSCI_ZARZAD/PROTOKOL_ZDAWCZO_ODBIORCZY_SZABLON.pdf"

if not os.path.exists(pdf_path):
    print(f"Error: {pdf_path} does not exist.")
    exit(1)

reader = PdfReader(pdf_path)
print(f"Total Pages: {len(reader.pages)}")

# Extract text page by page
for i, page in enumerate(reader.pages):
    print(f"\n--- PAGE {i + 1} ---")
    print(page.extract_text())

# Extract form fields (if interactive)
fields = reader.get_fields()
if fields:
    print("\n--- FORM FIELDS DETECTED ---")
    for field_name, field_value in fields.items():
        print(f"Field: {field_name} | Type: {field_value.get('/FT')} | Value: {field_value.get('/V')}")
else:
    print("\nNo interactive PDF form fields detected.")
