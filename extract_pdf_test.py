
import sys
import subprocess

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import pdfplumber
except ImportError:
    print("Installing pdfplumber...")
    install('pdfplumber')
    import pdfplumber

def extract_text(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            print(f"--- Page {page.page_number} ---")
            text = page.extract_text()
            print(text)
            print("--- Tables ---")
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    print(row)

if __name__ == "__main__":
    extract_text("public/data/人流量/202508.pdf")
