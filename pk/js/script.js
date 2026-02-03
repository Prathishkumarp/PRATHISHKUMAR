/**
 * Stellar Insights — Form validation and webhook submission
 */

(function () {
  "use strict";

  const form = document.getElementById("astrology-form");
  const submitBtn = document.getElementById("submit-btn");
  const successMessage = document.getElementById("success-message");
  const errorMessage = document.getElementById("error-message");
  const errorMessageText = document.getElementById("error-message-text");

  const requiredFields = [
    "fullName",
    "dateOfBirth",
    "placeOfBirth",
    "areaOfFocus",
    "email",
  ];

  const validators = {
    fullName: (value) => {
      const trimmed = (value || "").trim();
      if (trimmed.length < 2) return "Please enter at least 2 characters.";
      if (trimmed.length > 100) return "Name must be 100 characters or less.";
      if (!/^[\p{L}\s\-'.]+$/u.test(trimmed))
        return "Name should contain only letters, spaces, hyphens, or apostrophes.";
      return null;
    },
    dateOfBirth: (value) => {
      if (!value) return "Please select your date of birth.";
      const date = new Date(value);
      const now = new Date();
      if (date > now) return "Date of birth cannot be in the future.";
      const minYear = 1900;
      if (date.getFullYear() < minYear)
        return "Please enter a valid date of birth (year " + minYear + " or later).";
      return null;
    },
    placeOfBirth: (value) => {
      const trimmed = (value || "").trim();
      if (trimmed.length < 2) return "Please enter at least 2 characters.";
      if (trimmed.length > 200) return "Place must be 200 characters or less.";
      return null;
    },
    areaOfFocus: (value) => {
      if (!value) return "Please choose an area of focus.";
      return null;
    },
    email: (value) => {
      const trimmed = (value || "").trim();
      if (!trimmed) return "Please enter your email address.";
      const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(trimmed)) return "Please enter a valid email address.";
      return null;
    },
  };

  function getField(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function getErrorEl(name) {
    return document.getElementById(name + "-error");
  }

  function showFieldError(name, message) {
    const field = getField(name);
    const errorEl = getErrorEl(name);
    if (field) {
      field.classList.add("error-field");
      field.setAttribute("aria-invalid", "true");
    }
    if (errorEl) errorEl.textContent = message || "";
  }

  function clearFieldError(name) {
    const field = getField(name);
    const errorEl = getErrorEl(name);
    if (field) {
      field.classList.remove("error-field");
      field.removeAttribute("aria-invalid");
    }
    if (errorEl) errorEl.textContent = "";
  }

  function validateField(name) {
    const field = getField(name);
    if (!field) return true;
    const value = field.type === "checkbox" ? field.checked : field.value;
    const validator = validators[name];
    const error = validator ? validator(value) : null;
    if (error) {
      showFieldError(name, error);
      return false;
    }
    clearFieldError(name);
    return true;
  }

  function validateForm() {
    let valid = true;
    requiredFields.forEach(function (name) {
      if (!validateField(name)) valid = false;
    });
    return valid;
  }

  function getFormData() {
    const data = {};
    const inputs = form.querySelectorAll("input, select");
    inputs.forEach(function (el) {
      const name = el.name;
      if (!name) return;
      if (el.type === "checkbox") {
        data[name] = el.checked;
      } else {
        const value = (el.value || "").trim();
        if (value !== "" || requiredFields.indexOf(name) !== -1) {
          data[name] = value;
        }
      }
    });
    return data;
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle("loading", loading);
    submitBtn.setAttribute("aria-busy", loading ? "true" : "false");
  }

  function showSuccess() {
    successMessage.hidden = false;
    errorMessage.hidden = true;
    form.reset();
    requiredFields.forEach(clearFieldError);
    successMessage.focus({ preventScroll: true });
  }

  function showError(text) {
    errorMessageText.textContent = text || "Please try again later or check your connection.";
    errorMessage.hidden = false;
    successMessage.hidden = true;
    errorMessage.focus({ preventScroll: true });
  }

  function hideMessages() {
    successMessage.hidden = true;
    errorMessage.hidden = true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideMessages();

    if (!validateForm()) {
      const firstError = form.querySelector(".error-field, [aria-invalid='true']");
      if (firstError) firstError.focus();
      return;
    }

    const webhookUrl = typeof CONFIG !== "undefined" && CONFIG.WEBHOOK_URL ? CONFIG.WEBHOOK_URL : "";

    if (!webhookUrl) {
      showError(
        "Webhook is not configured. Please set CONFIG.WEBHOOK_URL in js/config.js to your n8n webhook URL."
      );
      return;
    }

    const payload = getFormData();
    setLoading(true);

    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (res.ok) {
          showSuccess();
          return;
        }
        return res.text().then(function (text) {
          throw new Error(res.status + " " + (text || res.statusText));
        });
      })
      .catch(function (err) {
        const message =
          err.message || "Request failed. Please check your connection and try again.";
        showError(message);
      })
      .finally(function () {
        setLoading(false);
      });
  });

  requiredFields.forEach(function (name) {
    const field = getField(name);
    if (field) {
      field.addEventListener("blur", function () {
        validateField(name);
      });
      field.addEventListener("input", function () {
        clearFieldError(name);
      });
    }
  });
})();
