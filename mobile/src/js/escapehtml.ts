function isAllowedTag(html: string): [number, string] {
  const one = html.charAt(0);
  switch (one) {
  case '\r':
    if (html.charAt(1) === '\n') {
      return [2, '<br>'];
    }
  case '\n':
    return [1, '<br>'];
  case '<':
    return [1, '&lt;'];
  case '>':
    return [1, '&gt;'];
  case '&':
    {
      const match = /&[a-zA-Z]+;/.exec(html);
      if (match) {
        return [match[0].length, match[0]];
      }
      return [1, '&amp;'];
    }
  default:
    throw 'Unreachable: ' + one;
  }
}

export default function escapeHtml(html: string) {
  let out = '';
  let i = 0;
  while (true) {
    i = html.search(/[<>&\r\n]/);
    if (i === -1) {
      out += html;
      break;
    }
    out += html.substring(0, i);
    html = html.substring(i);
    const tagInfo = isAllowedTag(html);
    out += tagInfo[1];
    html = html.substring(tagInfo[0]);
  }
  return out;
}
