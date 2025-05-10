from openai import OpenAI
from flask import current_app

def create_openai_client():
    return OpenAI(
        api_key=current_app.config["OPENAI_API_KEY"]
    )

def process_receipt(content):
    client = create_openai_client()
    prompt = """Extract a single record from the receipt OCR text below and return only a JSON object with the following format:
    {
      "amount": total amount as a number,
      "category": the most appropriate category from [Food, Transportation, Entertainment, Shopping, Bills, Other],
      "description": a brief summary, such as the store name and type (e.g. "Groceries at Spudshed"),
      "date": timestamp in the format "2025-05-04T15:18:00"
    }
    Here is the OCR text:
    """
    completion = client.chat.completions.create(
        model="gpt-4.1-nano",
        store=True,
        messages=[
            {"role": "user", "content": prompt + content}
        ]
    )
    # Parse the response content to ensure it's a JSON object
    return completion.choices[0].message.content