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
    if (theme !== "light" && theme !== "dark") {
        theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector(".h-captcha").setAttribute("data-theme", theme);

    var form = document.getElementById("contact-form");
    var statusEl = document.getElementById("status");
    var sendBtn = document.getElementById("send");
    var fallbackEl = document.getElementById("fallback");

    function el(n) { return form.elements.namedItem(n); }
    function val(n) { var e = el(n); return e ? e.value : ""; }

    function setStatus(kind, text) {
        statusEl.className = "show " + kind;
        statusEl.textContent = text;
    }
    function clearStatus() { statusEl.className = ""; statusEl.textContent = ""; }
    function fieldError(id, text) {
        var input = document.getElementById(id);
        var err = document.getElementById(id + "-err");
        if (err) err.textContent = text || "";
        if (input) { if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); }
    }
    function showFallback() {
        if (CONFIG.fallbackEmail) {
            fallbackEl.hidden = false;
            fallbackEl.textContent = "You can also email me at " + CONFIG.fallbackEmail + ".";
        }
    }
    function validate() {
        var ok = true;
        var name = val("name").trim();
        var email = val("email").trim();
        var topic = val("topic");
        var message = val("message").trim();
        fieldError("name", ""); fieldError("email", ""); fieldError("topic", ""); fieldError("message", "");
        if (!name) { fieldError("name", "Please enter your name."); ok = false; }
        if (!email) { fieldError("email", "Please enter your email."); ok = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError("email", "Please enter a valid email address."); ok = false; }
        if (!topic) { fieldError("topic", "Please choose a topic."); ok = false; }
        if (!message) { fieldError("message", "Please enter a message."); ok = false; }
        else if (message.length > CONFIG.maxMessage) { fieldError("message", "Please keep the message under " + CONFIG.maxMessage + " characters."); ok = false; }
        return ok;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        clearStatus();
        fallbackEl.hidden = true;

        if (!CONFIG.accessKey || CONFIG.accessKey.indexOf("PASTE_") === 0) {
            setStatus("error", "This form is not set up yet. The access key is missing.");
            return;
        }
        if (!validate()) {
            setStatus("error", "Please fix the highlighted fields.");
            return;
        }
        var captchaField = form.querySelector('textarea[name="h-captcha-response"]');
        if (!captchaField) {
            setStatus("error", "The captcha did not load. Try another browser, or turn off tracking protection for this page, then reload.");
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
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(data)
        })
            .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
            .then(function (result) {
                if (result.ok && result.json && result.json.success) {
                    form.reset();
                    setStatus("ok", "Thank you. Your message was sent, and I'll reply by email.");
                } else {
                    var msg = result.json && result.json.message ? result.json.message : "Something went wrong.";
                    setStatus("error", "Your message could not be sent: " + msg);
                    showFallback();
                }
            })
            .catch(function () {
                setStatus("error", "Network problem. Please check your connection and try again.");
                showFallback();
            })
            .then(function () {
                sendBtn.disabled = false;
                if (window.hcaptcha && typeof window.hcaptcha.reset === "function") { try { window.hcaptcha.reset(); } catch (e) { } }
            });
    });
})();
