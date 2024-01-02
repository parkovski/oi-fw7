export function getTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  let timeStr, ampm;
  if (hours === 0) {
    timeStr = '12';
    ampm = 'am';
  } else if (hours < 12) {
    timeStr = hours;
    ampm = 'am';
  } else if (hours === 12) {
    timeStr = '12';
    ampm = 'pm';
  } else {
    timeStr = '' + (hours - 12);
    ampm = 'pm';
  }
  if (minutes < 10) {
    timeStr += ':0' + minutes;
  } else {
    timeStr += ':' + minutes;
  }
  return timeStr + ampm;
}

export function getTimeRange(start, end) {
  if (start.valueOf() === end.valueOf()) {
    return getTime(start);
  }
  return `${getTime(start)} - ${getTime(end)}`;
}
