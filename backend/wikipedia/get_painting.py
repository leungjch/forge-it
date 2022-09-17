import base64
from bs4 import BeautifulSoup
import flask
from io import BytesIO
import os
from PIL import Image
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
        self.paintings = {}
        # List of artists to ignore
        # Some have < 3 paintings, so we ignore them
        self.bad_artists = ['Roberto Matta', 'Christoffer Wilhelm Eckersberg', 'Lennart Rodhe', 'Thomas Kinkade', 'Kurt Schwitters', 'Doug Wheeler', 'Remedios Varo', 'Lygia Pape', 'Xu Beihong', 'Hans Bellmer', 'Carl Bloch', 'Vangel Naumovski', 'Donald Sultan', 'Jean Rene Bazaine', 'Arthur Lowe', 'Takashi Murakami', 'George Inness', 'Mel Bochner', 'Arman', 'Damien Hirst', 'Laszlo Moholy Nagy', 'Corneille', 'Marcel Barbeau', 'Thomas Downing', 'Jules Perahim', 'Sonya Rapoport', 'Marcel Broodthaers', 'Lorser Feitelson', 'Robert Delaunay', 'Sorin Ilfoveanu', 'Natalia Dumitresco', 'Gil Teixeira Lopes', 'Marin Gherasim', 'Paolo Scheggi', 'Isa Genzken', 'Frida Kahlo', 'James Turrell', 'Christian Schad', 'Roman Opalka', 'Otto Freundlich', 'Antoni Tapies', 'Philippe Halsman', 'Alberto Burri', 'Gerardo Dottori', 'Max Bill']

        for style in self.styles:
            self.paintings[style] = os.listdir(f'./wikiart/{style}')

        if not os.path.isdir('./wikiart/byartist'):
            print('Create ./wikiart/byartist directory')
            # sort images by artist
            os.mkdir('./wikiart/byartist')
            for style in self.styles:
                for painting in self.paintings[style]:
                    try:
                        artist, title = painting.title().replace('-', ' ').split('_', 1)
                    except:
                        print("failed on", painting)
                    if not os.path.isdir(f'./wikiart/byartist/{artist}'):
                        os.mkdir(f'./wikiart/byartist/{artist}')
                    shutil.copyfile(f'./wikiart/{style}/{painting}', f'./wikiart/byartist/{artist}/{title}')
                    # now make sure that all of them work
                    #if True:
                        #artist_page = self.get_page(artist)
                        #style_page = self.get_page(style)
                        #print(artist_page)

        # This block ignore the bs4 GuessedAtParserWarning error,
        # which is only shown the first time wikipedia is called.
        # Wait nvm sometimes the warning still shows
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            style = 'Realism'
            self.get_page(style)

    def get_painting(self, style=''):
        if not style:
            style = random.choice(self.styles)
    
        redo = True
        fail_count = 0
        while redo:
            try:
                redo = False
                painting = random.choice(self.paintings[style])
                artist, title = painting.title().replace('-', ' ').split('_', 1)
                if artist in self.bad_artists:
                    redo = True
                    continue
                #print(artist, title)
                artist_page = self.get_page(artist)
                #print(artist_page.summary)

                style_page = self.get_page(style)
                #print(style_page.summary)

                img_path = f'./wikiart/{style}/{painting}'
                #print(img_path)
            except:
                redo = True
                fail_count += 1
                if fail_count == 4:
                    # if it fails too many times, just do a different style
                    fail_count = 0
                    style = random.choice(self.styles)

        # read the image and save to base64 string
        from PIL import Image, ImageOps
        import base64
        from io import BytesIO
        image = Image.open(img_path)
        image = ImageOps.contain(image, (512,512))

        buffer = BytesIO()
        image.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()
        image_b64_str = f"data:image/png;base64,{base64.b64encode(image_bytes).decode('utf-8')}"
        width, height = image.size

        return {
            "artist": artist, 
            "title": title,
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
        sections = page.sections

        for section in sections:
            if any(x in section.lower() for x in ["style", "work", "art"] ):
                return self.get_section(section)
            else:
                print("No style section")
                return ''

    def get_section(self, page, section):
        if section in page.sections:
            return page.section(section)
        else:
            print("Failed to get section")
            return ''

# p = PaintingPicker()
