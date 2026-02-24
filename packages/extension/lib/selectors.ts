export function getSelector(element: Element): string {
  if (element.id) {
    return `${element.tagName.toLowerCase()}#${element.id}`;
  }

  const classes = Array.from(element.classList).slice(0, 3).join(".");
  if (classes) {
    return `${element.tagName.toLowerCase()}.${classes}`;
  }

  return element.tagName.toLowerCase();
}

export function getElementText(element: Element): string {
  const text = (element.textContent ?? "").trim();
  if (text.length > 80) {
    return text.substring(0, 80) + "...";
  }
  return text;
}

export function getFieldName(element: Element): string {
  return (
    element.getAttribute("name") ??
    element.getAttribute("aria-label") ??
    element.id ??
    element.getAttribute("placeholder") ??
    "unknown"
  );
}
