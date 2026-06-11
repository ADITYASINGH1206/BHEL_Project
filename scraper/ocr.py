import os
import io
import base64
import re
from PIL import Image, ImageEnhance, ImageFilter
from transformers import TrOCRProcessor, VisionEncoderDecoderModel, logging
import torch

class CaptchaSolver:
    def __init__(self):
        """
        Initializes the TrOCR model and processor for CAPTCHA solving.
        Loads the 'small' variant directly via HuggingFace Hub to avoid OOM 
        and disk space exhaustion on cloud instances.
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        print("Loading TrOCR model from Hugging Face...")
        logging.set_verbosity_error()
        try:
            # Using 'small' variant because the 'base' variant requires 1.3GB+ RAM
            # which consistently triggers the OOM killer on cloud instances.
            model_name = "microsoft/trocr-small-printed"
            self.processor = TrOCRProcessor.from_pretrained(model_name)
            self.model = VisionEncoderDecoderModel.from_pretrained(model_name).to(self.device)
            print("TrOCR model loaded successfully.")
        except Exception as e:
            print(f"Failed to load the model: {e}")
            raise

    def _preprocess_image(self, image: Image.Image, save_debug: bool = False) -> Image.Image:
        """
        Preprocesses the CAPTCHA image to remove background noise and enhance text.
        """
        # 1. Convert to grayscale
        image = image.convert("L")
        
        # 2. Increase contrast dramatically
        enhancer_contrast = ImageEnhance.Contrast(image)
        image = enhancer_contrast.enhance(4.0)
        
        # 3. Enhance sharpness
        enhancer_sharpness = ImageEnhance.Sharpness(image)
        image = enhancer_sharpness.enhance(2.0)
        
        # 4. Apply thresholding (Binarization)
        # Any pixel lighter than 140 becomes pure white (255), darker becomes solid black (0)
        image = image.point(lambda p: 0 if p < 140 else 255)
        
        # 5. Convert back to RGB for TrOCR processor
        image = image.convert("RGB")
        
        # Optional: Save preprocessed image to disk to verify it looks clean
        if save_debug:
            debug_dir = os.path.join(os.path.dirname(__file__), "captcha_images")
            os.makedirs(debug_dir, exist_ok=True)
            try:
                image.save(os.path.join(debug_dir, "debug_clean.png"))
            except Exception as e:
                print(f"Warning: Could not save debug image: {e}")
                
        return image

    def solve_base64(self, base64_str: str, save_debug: bool = False) -> str:
        """
        Takes a base64 encoded image string, decodes it, preprocesses it, and returns the solved text.
        """
        try:
            # Remove header if present (e.g. data:image/png;base64,...)
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            
            image_data = base64.b64decode(base64_str)
            image = Image.open(io.BytesIO(image_data))
            
            # Apply preprocessing pipeline
            processed_image = self._preprocess_image(image, save_debug=save_debug)
            
            pixel_values = self.processor(images=processed_image, return_tensors="pt").pixel_values.to(self.device)
            generated_ids = self.model.generate(pixel_values, max_new_tokens=10)
            generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # Sanitize the output to remove any lingering punctuation or formatting artifacts
            cleaned_text = re.sub(r'[^a-zA-Z0-9]', '', generated_text).strip()
            
            # 1. Enforce Uppercase
            cleaned_text = cleaned_text.upper()
            
            # 2. Character Substitution (Confusion Matrix)
            # Fix common TrOCR hallucinations on distorted characters
            replacements = {
                'O': '0',
                'I': '1',
                'L': '1',
                'S': '5',
                'Z': '2',
                'G': '6',
                'B': '8'
            }
            for old_char, new_char in replacements.items():
                cleaned_text = cleaned_text.replace(old_char, new_char)
                
            # 3. Length Validation Check
            if len(cleaned_text) != 5:
                # Return empty string to signal scraper to skip submission
                return ""
                
            return cleaned_text
        except Exception as e:
            print(f"Error solving CAPTCHA: {e}")
            return ""

# For testing
if __name__ == "__main__":
    solver = CaptchaSolver()
    # Mock base64 to test loading
    # result = solver.solve_base64("data:image/png;base64,...")
    # print(result)
