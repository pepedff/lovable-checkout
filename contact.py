from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
for device in ['desktop','tablet','mobile']:
 files=list(Path('qa').glob('*-'+device+'.png'))
 board=Image.new('RGB',(1200,((len(files)+2)//3)*520),'#ddd')
 for i,f in enumerate(files):
  im=Image.open(f);im.thumbnail((390,485));x=(i%3)*400;y=(i//3)*520
  board.paste(im,(x,y+25));ImageDraw.Draw(board).text((x+8,y+6),f.stem,fill='black')
 board.save('qa/contact-'+device+'.png')
im=Image.open('qa/landing-desktop.png');im.crop((0,0,1440,1000)).save('qa/hero.png')
