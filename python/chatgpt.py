from openai import OpenAI
import sys

input_text = sys.argv[1].split("+")

prompt = ""
for i in range(len(input_text)):
    prompt += input_text[i]
    prompt += " "

print(prompt)

client = OpenAI(
  api_key="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"
)

completion = client.chat.completions.create(
  model="gpt-4o-mini",
  store=True,
  messages=[
    {"role": "user", "content": "give me a JSON-formatted response regarding a specific topic. The JSON format is: {content: the description of the content cited from its wikipedia page; relevant_topics: an array of topics that are related to the content preferably from the hyperlink of its wikipedia page}. The topic is: " + prompt}
  ]
)

print("chatgpt+" + completion.choices[0].message.content);
