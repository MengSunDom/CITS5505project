import easyocr

def ocr_image(file_stream, lang_list=['en']) -> str:
    """
    Perform OCR using EasyOCR (no external dependencies like Tesseract).
    :param file_stream: File stream of the image
    :param lang_list: List of language codes (e.g. ['en'], ['en', 'ch_sim'])
    :return: Full extracted text
    """
    reader = easyocr.Reader(lang_list, gpu=False)  # Use CPU
    results = reader.readtext(file_stream, detail=0)  # Pass file stream directly
    return "\n".join(results)
