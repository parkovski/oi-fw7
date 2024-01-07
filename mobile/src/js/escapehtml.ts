function isAllowedTag(html: string): [number, string] {
  const three = html.substring(0, 3);
  switch (three) {
  case '<b>':
    return [3, '<strong>'];
  case '<i>':
    return [3, '<em>'];
  case '<u>':
    return [3, '<u>'];
  }

  const four = html.substring(0, 4);
  switch (four) {
  case '</b>':
    return [4, '</strong>'];
  case '</i>':
    return [4, '</em>'];
  case '</u>':
    return [4, '</u>'];
  case '<br>':
    return [4, '<br>'];
  }

  const one = html.charAt(0);
  switch (one) {
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
    i = html.search(/[<>&]/);
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
