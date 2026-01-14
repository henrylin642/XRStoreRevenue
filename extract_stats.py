
import os
import glob
import pdfplumber
import json
import re

DATA_DIR = "public/data/人流量/"

def extract_all():
    files = glob.glob(os.path.join(DATA_DIR, "*.pdf"))
    results = {}

    for pdf_path in files:
        filename = os.path.basename(pdf_path)
        # Expect filename YYYYMM.pdf
        match = re.match(r"(\d{4})(\d{2})\.pdf", filename)
        if not match:
            print(f"Skipping {filename}")
            continue
        
        year = int(match.group(1))
        month = int(match.group(2))
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Assume data is on first page
                page = pdf.pages[0]
                tables = page.extract_tables()
                
                total_visitors = 0
                found = False

                for table in tables:
                    for row in table:
                        # Looking for row with "當月總計"
                        # Row usually: ['當月總計', None, '241,442'] or similar
                        # Cleanup row items
                        cleaned_row = [str(x).replace('\n', '').strip() for x in row if x is not None]
                        
                        if "當月總計" in cleaned_row:
                            # The last item should be the number
                            try:
                                val_str = cleaned_row[-1].replace(',', '')
                                total_visitors = int(val_str)
                                found = True
                                break
                            except ValueError:
                                continue
                    if found: break
                
                if found:
                    if year not in results: results[year] = {}
                    results[year][month] = total_visitors
                    print(f"Parsed {filename}: {year}-{month} = {total_visitors}")
                else:
                    print(f"Failed to find total in {filename}")

        except Exception as e:
            print(f"Error processing {pdf_path}: {e}")

    # Print JSON result
    print("--- JSON OUTPUT ---")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    extract_all()
