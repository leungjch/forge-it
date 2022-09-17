import os
import shutil
dirs = os.listdir('./sample-wikiart')
for s in dirs:
    ss = s.replace('_', ' ')
    shutil.move(f'./sample-wikiart/{s}', f'./sample-wikiart/{ss}')
