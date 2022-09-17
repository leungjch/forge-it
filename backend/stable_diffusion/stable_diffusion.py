import torch
from diffusers import StableDiffusionPipeline
import base64
from PIL import Image
from io import BytesIO
import re
import uuid
# TODO: Hide the token
TOKEN = "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"

model_id = "CompVis/stable-diffusion-v1-4"
device = "cuda"

# https://stackoverflow.com/questions/57066162/how-to-get-docker-to-recognize-nvidia-drivers
pipe = StableDiffusionPipeline.from_pretrained(model_id, use_auth_token=TOKEN, torch_dtype=torch.float16, revision="fp16")
pipe = pipe.to(device)


# Returns next multiple of 64
def round_up(x):
    return x + (64-x)%64


def resize_to_stable_diffusion_pipe_size(height, width):
    
    new_height = height
    new_width = width

    if height < width:
        new_height = 512
        new_width = int(width * (512 / height))
        new_width = round_up(new_width)
    else:
        new_width = 512
        new_height = int(height * (512 / width))
        new_height = round_up(new_height)
    
    return new_height, new_width


def generate_image(prompt, n_images, n_iterations, height, width):
    print("Starting Stable Diffusion generation...")

    # resize to proper resolution for stable diffusion
    # new_height, new_width = resize_to_stable_diffusion_pipe_size(height, width)
    # print(prompt, n_images, new_height, new_width)
    # print('new_height', new_height, "new_width", new_width)

    with torch.cuda.amp.autocast(True):
        image = pipe(prompt, guidance_scale=7.5, num_inference_steps=n_iterations, height=512, width=512)["sample"][0]  
        # image = pipe(prompt, guidance_scale=7.5, num_inference_steps=n_iterations, height=new_height, width=new_width)["sample"][0]  
        # image = image.resize((width, height))
        # print('final_height', height, 'final_width', width)

        filename = prompt[0:20].replace(" ", "_")
        filename = re.sub(r'\W+', '', filename)
        print(f"Saved image to {filename}")
        image.save(f"output/{filename}.png")

        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        # Generate a uuid for the generated painting
        id = str(uuid.uuid4())
        ret = {"image_bytes": img_str, "prompt": prompt, "id": id}
        return ret