import struct, zlib, math

def create_png(size, bg_color, emoji_placeholder=True):
    """Create a minimal PNG with indigo background"""
    width = height = size
    
    def pack_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = pack_chunk(b'IHDR', ihdr_data)
    
    r, g, b = bg_color
    rows = []
    for y in range(height):
        row = [0]
        for x in range(width):
            cx, cy = x - width//2, y - height//2
            dist = math.sqrt(cx*cx + cy*cy)
            radius = width * 0.4
            
            # Rounded square background
            rx = abs(cx) - width*0.3
            ry = abs(cy) - height*0.3
            corner_r = width * 0.15
            in_rect = rx < corner_r and ry < corner_r and (rx < 0 or ry < 0 or rx*rx+ry*ry < corner_r*corner_r)
            
            if in_rect:
                row.extend([r, g, b])
            else:
                # light bg
                row.extend([238, 242, 255])
        rows.append(bytes(row))
    
    import io
    compressed = zlib.compress(b''.join(rows))
    idat = pack_chunk(b'IDAT', compressed)
    iend = pack_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

for size in [192, 512]:
    data = create_png(size, (99, 102, 241))
    with open(f'/Users/vikashmaurya/workspace/apps/spend-tracker/public/icons/icon-{size}.png', 'wb') as f:
        f.write(data)
    print(f'Created icon-{size}.png')
