import requests
import os
import time

import sys

headers = {
  "Authorization": f"Bearer msy_AG9G6n5paA63XLBAlCw4pdHBWVfyZLTSNSfu"
}

# 1. Generate a preview model and get the task ID

generate_preview_request = {
  "mode": "preview",
  "prompt": "a house",
  "negative_prompt": "low quality, low resolution, low poly, ugly",
  "art_style": "realistic",
  "should_remesh": True,
}

generate_preview_response = requests.post(
  "https://api.meshy.ai/openapi/v2/text-to-3d",
  headers=headers,
  json=generate_preview_request,
)

generate_preview_response.raise_for_status()

preview_task_id = generate_preview_response.json()["result"]

#print("Preview task created. Task ID:", preview_task_id)

# 2. Poll the preview task status until it's finished

preview_task = None

while True:
  preview_task_response = requests.get(
    f"https://api.meshy.ai/openapi/v2/text-to-3d/{preview_task_id}",
    headers=headers,
  )

  preview_task_response.raise_for_status()

  preview_task = preview_task_response.json()

  if preview_task["status"] == "SUCCEEDED":
    #print("Preview task finished.")
    break

  #print("Preview task status:", preview_task["status"], "| Progress:", preview_task["progress"], "| Retrying in 5 seconds...")
  time.sleep(5)

# 3. Download the preview model in glb format

preview_model_url = preview_task["model_urls"]["glb"]

preview_model_response = requests.get(preview_model_url)
preview_model_response.raise_for_status()

with open("./media/gltf/preview_model.glb", "wb") as f:
  f.write(preview_model_response.content)

print("./media/gltf/preview_model.glb")

