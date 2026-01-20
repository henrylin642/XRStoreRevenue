import pandas as pd
import sys

def analyze_excel(file_path):
    try:
        df = pd.read_excel(file_path)
        print("Columns Found:")
        print(df.columns.tolist())
        print("\nFirst 3 rows:")
        print(df.head(3).to_string())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_excel(sys.argv[1])
    else:
        print("Please provide a file path.")
