from PIL import Image

def process_image(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    datas = img.getdata()
    newData = []
    
    for item in datas:
        r, g, b, a = item
        lum = (r * 0.299 + g * 0.587 + b * 0.114)
        alpha = int(max(0, min(255, (lum - 80) * (255.0 / (180.0 - 80.0)))))
        newData.append((255, 255, 255, alpha))
        
    img.putdata(newData)
    img.save(output_path, 'PNG')

process_image('mobile/assets/images/webot_logo.jpg', 'mobile/assets/images/webot_logo_transparent.png')
print('Image processing complete!')
