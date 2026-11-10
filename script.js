const CONFIG = {
    accessKey: "efbceb6c-e2b4-42bb-afbe-de3986208f35",
    subject: "New message from the AEM Deep Dive contact form",
    fromName: "AEM Deep Dive contact form",
    fallbackEmail: "AEMDeepDive@Outlook.com",
    maxMessage: 3000
};
(function () {
  var params = new URLSearchParams(window.location.search);
  var theme = params.get("theme");
  
  if (params.get("embed") === "true") {
    document.documentElement.setAttribute("data-embed", "true");
  }

  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  document.documentElement.setAttribute("data-theme", theme);

  var captcha = document.querySelector(".h-captcha");
  if (captcha) {
    captcha.setAttribute("data-theme", theme);
  }

  var form = document.getElementById("contact-form");
  var statusEl = document.getElementById("status");
  var sendBtn = document.getElementById("send");
  var fallbackEl = document.getElementById("fallback");

  function el(name) {
    return form.elements.namedItem(name);
  }

  function val(name) {
    var field = el(name);
    return field ? field.value : "";
  }

  function setStatus(kind, message) {
    statusEl.className = "show " + kind;
    statusEl.textContent = message;
  }

  function clearStatus() {
    statusEl.className = "";
    statusEl.textContent = "";
  }

  function fieldError(id, message) {
    var input = document.getElementById(id);
    var error = document.getElementById(id + "-err");

    if (error) {
      error.textContent = message || "";
    }

    if (input) {
      if (message) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    }
  }

  function showFallback() {
    if (CONFIG.fallbackEmail) {
      fallbackEl.hidden = false;
      fallbackEl.textContent =
        "You can also email me at " + CONFIG.fallbackEmail + ".";
    }
  }

  function validate() {
    var valid = true;
    var name = val("name").trim();
    var email = val("email").trim();
    var topic = val("topic");
    var message = val("message").trim();

    fieldError("name", "");
    fieldError("email", "");
    fieldError("topic", "");
    fieldError("message", "");

    if (!name) {
      fieldError("name", "Please enter your name.");
      valid = false;
    }

    if (!email) {
      fieldError("email", "Please enter your email.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldError("email", "Please enter a valid email address.");
      valid = false;
    }

    if (!topic) {
      fieldError("topic", "Please choose a topic.");
      valid = false;
    }

    if (!message) {
      fieldError("message", "Please enter a message.");
      valid = false;
    } else if (message.length > CONFIG.maxMessage) {
      fieldError(
        "message",
        "Please keep the message under " + CONFIG.maxMessage + " characters."
      );
      valid = false;
    }

    return valid;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearStatus();
    fallbackEl.hidden = true;

    if (!CONFIG.accessKey ||
        CONFIG.accessKey.indexOf("PASTE_") === 0) {
      setStatus("error", "This form is not set up yet. The access key is missing.");
      return;
    }

    if (!validate()) {
      setStatus("error", "Please fix the highlighted fields.");
      return;
    }

    var captchaField = form.querySelector(
      'textarea[name="h-captcha-response"]'
    );

    if (!captchaField) {
      setStatus(
        "error",
        "The captcha did not load. Try another browser, or turn off tracking protection for this page, then reload."
      );
      showFallback();
      return;
    }

    if (!captchaField.value) {
      setStatus("error", "Please complete the captcha check.");
      return;
    }

    var data = {
      access_key: CONFIG.accessKey,
      subject: CONFIG.subject,
      from_name: CONFIG.fromName,
      name: val("name").trim(),
      email: val("email").trim(),
      topic: val("topic"),
      aem_version: val("aem_version") || "Not specified",
      message: val("message").trim(),
      botcheck: el("botcheck") && el("botcheck").checked ? "on" : "",
      "h-captcha-response": captchaField.value
    };

    sendBtn.disabled = true;
    setStatus("info", "Sending...");

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(data)
    })
      .then(function (response) {
        return response.json().then(function (json) {
          return { ok: response.ok, json: json };
        });
      })
      .then(function (result) {
        if (result.ok && result.json && result.json.success) {
          form.reset();
          setStatus(
            "ok",
            "Thank you. Your message was sent, and I'll reply by email."
          );
        } else {
          var message = result.json && result.json.message
            ? result.json.message
            : "Something went wrong.";

          setStatus("error", "Your message could not be sent: " + message);
          showFallback();
        }
      })
      .catch(function () {
        setStatus(
          "error",
          "Network problem. Please check your connection and try again."
        );
        showFallback();
      })
      .then(function () {
        sendBtn.disabled = false;

        if (window.hcaptcha &&
            typeof window.hcaptcha.reset === "function") {
          try {
            window.hcaptcha.reset();
          } catch (error) {
            // Ignore reset errors; the form response has already been handled.
          }
        }
      });
  });
})();