import os
import sys
from google import genai
from google.genai import types

def main():
    try:
        client = genai.Client(api_key="mock_key")
        print("Client initialized")
    except Exception as e:
        print(f"Error: {e}")

main()
