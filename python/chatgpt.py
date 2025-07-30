from openai import OpenAI
import sys
import base64
import re

arg = sys.argv[1]

client = OpenAI(
  api_key="APIKEY-Hoz_TnAlJQCFtM4hToJx-w22z-oB7T8WuFb5bpvyWfxrvRAzJ8h4XVLWTP-ERrf5mwOVS63gWFT3BlbkFJimBq_H6yJVvx7IRGyfiJbPk-vNBJyOjZsCMqo3HzrWr7ZroNmYgCzZ4tJ07-Bj1BHNcnsLZ5cA"
)

with open(arg, "rb") as f:
    data = f.read()

base64_string = base64.b64encode(data).decode("utf-8")

response = client.responses.create(
    model="gpt-4.1",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_file",
                    "filename": arg,
                    "file_data": f"data:application/pdf;base64,{base64_string}",
                },
                {
                    "type": "input_text",
                    "text": "Summarize the paper by each subdivision, then output these subdivisions using a single JSON file with the format of {name-of-the-subdivision}: {spatial-coordinate}, with the spatial-coordinate being a 3D vector indicating the preferrable spatial layout of this subdivision in a 3D UI space.",
                },
            ],
        },
    ]
)
start = response.output_text.index("{") + 1
end = response.output_text.index("}")

text = response.output_text[start:end]

print("chatgpt+" + "{" + text + "}")
