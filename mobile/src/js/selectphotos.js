export default function selectPhotos(callback, multiple) {
  let input = document.getElementById('upload-photo-input');

  if (!input) {
    input = document.createElement('input');
    input.id = 'upload-photo-input';
    input.type = 'file';
    input.hidden = true;
    if (multiple) {
      input.multiple = true;
    }
    input.addEventListener('change', () => {
      const file = multiple ? input.files : input.files[0];
      try {
        callback(file);
      } finally {
        input.parentNode.removeChild(input);
      }
    });
    input.addEventListener('cancel', () => input.parentNode.removeChild(input));
    document.body.appendChild(input);
  }

  input.click();
}
