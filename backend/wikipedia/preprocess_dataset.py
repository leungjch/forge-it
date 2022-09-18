import base64
from bs4 import BeautifulSoup
import flask
from io import BytesIO
import os
from PIL import Image, ImageOps
import random
import shutil
import warnings
import wikipedia as w

"""
Extract the paintings archive, rename it to wikiart, place in same directory as this file
Run this before starting the server
It takes a couple of minutes...
"""

class PaintingPicker:
    def run(self, filter):
        self.styles = os.listdir('./wikiart')
        if "byartist" in self.styles:
            self.styles.remove("byartist")
        self.paintings = {}
        # List of artists to ignore
        # Some have < 4 paintings, so we ignore them
        # self.bad_artists = ['Roberto Matta', 'Christoffer Wilhelm Eckersberg', 'Lennart Rodhe', 'Thomas Kinkade', 'Kurt Schwitters', 'Doug Wheeler', 'Remedios Varo', 'Lygia Pape', 'Xu Beihong', 'Hans Bellmer', 'Carl Bloch', 'Vangel Naumovski', 'Donald Sultan', 'Jean Rene Bazaine', 'Arthur Lowe', 'Takashi Murakami', 'George Inness', 'Mel Bochner', 'Arman', 'Damien Hirst', 'Laszlo Moholy Nagy', 'Corneille', 'Marcel Barbeau', 'Thomas Downing', 'Jules Perahim', 'Sonya Rapoport', 'Marcel Broodthaers', 'Lorser Feitelson', 'Robert Delaunay', 'Sorin Ilfoveanu', 'Natalia Dumitresco', 'Gil Teixeira Lopes', 'Marin Gherasim', 'Paolo Scheggi', 'Isa Genzken', 'Frida Kahlo', 'James Turrell', 'Christian Schad', 'Roman Opalka', 'Otto Freundlich', 'Antoni Tapies', 'Philippe Halsman', 'Alberto Burri', 'Gerardo Dottori', 'Max Bill']

        self.bad_artists = []
        if filter:
            # do this on a later run, after byartist/{artist}/ gets populated
            self.bad_artists = self.get_bad_artists()
            print(self.bad_artists)

        for style in self.styles:
            self.paintings[style] = os.listdir(f'./wikiart/{style}')

        good_count = bad_count = 0

        # if not os.path.isdir('./wikiart/byartist'):
        if True:
            # sort images by artist
            # print('Create ./wikiart/byartist directory')
            # os.system('rm -r ./wikiart/byartist')
            # os.mkdir('./wikiart/byartist')
            for style in self.styles:
                for painting in self.paintings[style]:
                    img_path = f'./wikiart/{style}/{painting}'
                    artist, title = painting.title().replace('-', ' ').split('_', 1)

                    if artist in self.bad_artists:
                        os.remove(img_path)
                        os.remove(f'./wikiart/byartist/{artist}/{title}')
                        bad_count += 1
                        continue

                    # image = Image.open(img_path)
                    # width, height = image.size
                    # ratio = min(width, height)/max(width, height)
                    # good = 0
                    # if ratio >= 2/3:
                    #     good_count += 1
                    #     good = 1
                    #     try:
                    #         image = self.crop_into_square(image)
                    #         image.save(img_path)
                    #     except:
                    #         print('error on', img_path)
                    #         good = 0
                    #         good_count -= 1
                    #         bad_count += 1
                    #         os.remove(img_path)
                    # else:
                    #     bad_count += 1
                    #     os.remove(img_path)
                    #
                    # if good:
                    #     if not os.path.isdir(f'./wikiart/byartist/{artist}'):
                    #         os.mkdir(f'./wikiart/byartist/{artist}')
                    #     shutil.copyfile(f'./wikiart/{style}/{painting}', f'./wikiart/byartist/{artist}/{title}')

        for artist in self.bad_artists:
            os.rmdir(f'./wikiart/byartist/{artist}')

        print('good', good_count, 'bad', bad_count)

    def get_bad_artists(self):
        # find ./wikiart/byartist -maxdepth 1 -type d -exec bash -c "echo -ne '{} '; ls '{}' | wc -l" \; |   awk '$NF<=3'
        cmd = "find ./wikiart/byartist -maxdepth 1 -type d -exec bash -c \"echo -ne '{} '; ls '{}' | wc -l\" \; |   awk '$NF<=3'"
        output = os.popen(cmd).read()
        output = output.strip().split('\n')
        ret = []
        for s in output:
            if len(s) > 20:
                ret.append(s[19:-2])
        return ret 
    
    def crop_into_square(self, image):
        width, height = image.size
        if width > height:
            image = image.crop((width // 2 - height // 2, 0, width // 2 + height // 2, height))
        elif width < height:
            image = image.crop((0, height // 2 - width // 2, width, height // 2 + width //2))
        return image.resize((512, 512))


p = PaintingPicker()
# p.run(False)
# second time, delete bad ones
p.run(True)
# Right now some of them are completely black. Figure how what happened later
