import sys

# importing openai module 
import openai 
# assigning API KEY to the variable 
  
openai.api_key = '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'

import requests

# function for text-to-image generation  
# using create endpoint of DALL-E API 
# function takes in a string argument 
def generate(text): 
  res = openai.Image.create( 
    # text describing the generated image 
    prompt=text, 
    # number of images to generate  
    n=1, 
    # size of each generated image 
    size="256x256", 
  ) 
  # returning the URL of one image as  
  # we are generating only one image 
  return res["data"][0]["url"]


# prompt describing the desired image
prompt = sys.argv[1].split("+")
text = ""
for i in range(1,len(prompt)):
    text += prompt[i]
    text += " "

text += "with plain background"

# calling the custom function "generate" 
# saving the output in "url1" 
url1 = generate(text) 
# using requests library to get the image in bytes 
response = requests.get(url1)

# saving the image in PNG format
name = sys.argv[1]+".png"
with open(name, "wb") as f: 
  f.write(response.content)

#==================================================#

# let yolo do segmentation masking
# from PIL import Image
# import numpy as np
# import cv2
# from ultralytics import YOLO

# yolo = YOLO("yolov8m-seg.pt")

# img = Image.open(name)
# img_data = np.array(img)
# result = yolo.predict(img_data)

# alpha = Image.new('L', img.size)
# img.putalpha(alpha)

# img_data_a = np.array(img)

# for i in range(len(result[0].boxes.cls)):
#   points = np.int32([result[0].masks.xy[i]])
#   for y in range(len(img_data)):
#     for x in range(len(img_data[0])):
#       if cv2.pointPolygonTest(points, (x,y), False) > 0:
#         img_data_a[y][x][3] = 255

# img_a = Image.fromarray(img_data_a)
# img_a.save(name)

print(name)
