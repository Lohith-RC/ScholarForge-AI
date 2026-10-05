import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load the .env file to get the API key
load_dotenv()

print("Attempting to list available models...")

try:
    # Configure the API key
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    
    genai.configure(api_key=GEMINI_API_KEY)

    print("-" * 30)
    print("Models that support 'generateContent':")
    print("-" * 30)

    # List all models and filter for the ones that can generate content
    found_model = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
            found_model = True
    
    if not found_model:
        print("\nNo models supporting 'generateContent' found for your API key.")
        print("Please check your key, project permissions, and billing status in your Google Cloud or AI Studio console.")

except Exception as e:
    print(f"\nAn error occurred: {e}")