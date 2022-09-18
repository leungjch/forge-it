import base64
from io import BytesIO
import os
from PIL import Image, ImageOps
import random
import shutil
import warnings
import wikipedia as w

"""
Extract the paintings archive, rename it to wikiart, place in same directory as this file
"""


class PaintingPicker:
    def __init__(self):
        self.styles = os.listdir('./wikiart')
        self.styles.remove("byartist")
        self.paintings = {}

        for style in self.styles:
            self.paintings[style] = os.listdir(f'./wikiart/{style}')

        self.good_paintings = []

        # This block ignore the bs4 GuessedAtParserWarning error,
        # which is only shown the first time wikipedia is called.
        # Wait nvm sometimes the warning still shows

        # with warnings.catch_warnings():
        #     warnings.simplefilter('ignore')
        #     style = 'Realism'
        #     self.get_page(style)

    def get_painting(self, style=''):
        only_good_paintings = False
        if only_good_paintings:
            painting = random.choice(only_good_paintings)
            artist, title = painting.split('/')
            artist_page = self.get_page(artist)
            style_page = self.get_page(style)
            img_path = f'./wikiart/{artist}/{title}'
        else:
            if not style:
                style = random.choice(self.styles)
        
            redo = True
            fail_count = 0
            while redo:
                try:
                    redo = False
                    painting = random.choice(self.paintings[style])
                    artist, title = painting.title().replace('-', ' ').split('_', 1)
                    artist_page = self.get_page(artist)
                    style_page = self.get_page(style)
                    img_path = f'./wikiart/{style}/{painting}'
                except:
                    redo = True
                    fail_count += 1
                    if fail_count == 4:
                        # if it fails too many times, just do a different style
                        fail_count = 0
                        style = random.choice(self.styles)

        # read the image and save to base64 string
        image = Image.open(img_path)
        width, height = image.size
        # image = self.crop_into_square(image)
        image = ImageOps.contain(image, (512, 512))
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()
        image_b64_str = f"data:image/png;base64,{base64.b64encode(image_bytes).decode('utf-8')}"

        return {
            "artist": artist, 
            "title": title.split('.')[0], # remove the file extension
            "style": style,
            "artist_summary": artist_page.summary,
            "style_summary": style_page.summary,
            "artist_style_summary": self.get_artist_style_section(artist_page),
            "image_path": img_path, 
            "image_b64_str": image_b64_str,
            "image_width": width,
            "image_height": height
        }

    def get_arists_paintings(self, artist, count = 3, ignore = ""):
        required = count + (ignore != "")
        choices = os.listdir(f'./wikiart/byartist/{artist}')
        if len(choices) < required:
            return {
                "error": "not enough options"
            }

        try:
            choices.remove(ignore)
        except:
            pass

        ret = {"paintings": []}
        titles = random.sample(choices, count)
        for title in titles:
            img_path = f'./wikiart/byartist/{artist}/{title}'

            image = Image.open(img_path)
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            image_bytes = buffer.getvalue()
            image_b64_str = f"data:image/png;base64,{base64.b64encode(image_bytes).decode('utf-8')}"
            ret["paintings"].append({
                "title": title,
                "image_path": img_path,
                "image_b64_str": image_b64_str
            })
        return ret

    def get_page(self, s):
        s = w.search(s, results = 1)[0]
        try:
            return w.page(s, auto_suggest = False)
        except w.DisambiguationError as e:
            return w.page(e.options[0], auto_suggest = False)
    
    def get_artist_style_section(self, page):
        # Returns empty string if no style section
        for s in page.sections:
            if any(x in s.lower() for x in ["style", "work", "art"]):
                return page.section(s)
            else:
                print("No style section") # For debugging
                return ''

    def crop_into_square(self, image):
        
        width, height = image.size

        if width > height:
            image = image.crop((width // 2 - height // 2, 0, width // 2 + height // 2, height))
        elif width < height:
            image = image.crop((0, height // 2 - width // 2, width, height // 2 + width // 2))
        
        return image.resize((512, 512))


# p = PaintingPicker()
