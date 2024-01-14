export default function innerTextPolyfill(elem) {
  // Thanks to https://stackoverflow.com/questions/6868162/get-plain-text-from-contenteditable-div
  var sel = window.getSelection();

  // Remember old selection
  oldRanges = [];
  for (i=0; i < sel.rangeCount; i++){
    oldRanges.push(sel.getRangeAt(i));
  }
  sel.removeAllRanges();

  // Get elem text
  elemRange = document.createRange();
  elemRange.selectNode(elem);
  sel.addRange(elemRange);
  text = sel.toString();

  // Restore old selection and return
  sel.removeAllRanges();
  for (i=0; i < oldRanges.length; i++){
    sel.addRange(oldRanges[i]);
  }

  return text;
}
