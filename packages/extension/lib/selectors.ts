export function getSelector(element: Element): string {
  // Try the most specific identifiers first
  if (element.id) {
    return `${element.tagName.toLowerCase()}#${element.id}`;
  }

  const testId = element.getAttribute("data-testid") ?? element.getAttribute("data-test");
  if (testId) {
    return `${element.tagName.toLowerCase()}[data-testid="${testId}"]`;
  }

  const role = element.getAttribute("role");
  const ariaLabel = element.getAttribute("aria-label");
  if (role && ariaLabel) {
    return `${element.tagName.toLowerCase()}[role="${role}"][aria-label="${ariaLabel}"]`;
  }
  if (ariaLabel) {
    return `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
  }

  const classes = Array.from(element.classList).slice(0, 3).join(".");
  if (classes) {
    return `${element.tagName.toLowerCase()}.${classes}`;
  }

  return element.tagName.toLowerCase();
}

export function getElementText(element: Element): string {
  // For inputs, return placeholder or name
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return (
      element.getAttribute("placeholder") ??
      element.getAttribute("name") ??
      element.getAttribute("aria-label") ??
      ""
    );
  }

  // For links, prefer aria-label or title
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // Get direct text content, not children's text
  // First try innerText of the element itself (short text)
  const text = (element.textContent ?? "").trim();
  if (text.length === 0) return "";

  // If text is too long, the click was on a container — walk up to find a label
  if (text.length > 80) {
    const title = element.getAttribute("title");
    if (title) return title;

    // Try to get text from the closest small child
    const btn = element.querySelector("button, a, span, label, h1, h2, h3, h4, p");
    if (btn) {
      const btnText = (btn.textContent ?? "").trim();
      if (btnText.length > 0 && btnText.length <= 80) return btnText;
    }

    return text.substring(0, 60) + "...";
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
