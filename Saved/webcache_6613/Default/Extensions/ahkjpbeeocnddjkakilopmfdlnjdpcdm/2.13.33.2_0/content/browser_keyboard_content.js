AvNs.AddRunner("vk_mac", (ns, session, settings, locales) =>
{
    function BrowserKeyboard()
    {
        const InputKey = {
            EMPTY: 0,
            ENTER: 1,
            BACKSPACE: 2,
            SYMBOL: 3
        };

        const KeyMap = new Map([
            ["return", InputKey.ENTER],
            ["backspace", InputKey.BACKSPACE],
            ["symbol", InputKey.SYMBOL]
        ]);

        const Selectors = [{ tagName: "input", types: ["password", "search", "tel", "text", "url"] }, { tagName: "textarea" }];

        const m_balloon = new ns.BrowserKeyboardBalloon(session, locales, OnBalloonDataReceived);
        let m_activeElement = null;
        let m_shutdown = false;
        let m_callFunction = ns.EmptyFunc;

        function OnPing()
        {
            return ns.MaxRequestDelay;
        }

        function SubscribeOnFocusPasswordField()
        {
            if (!document.body)
            {
                ns.AddEventListener(window, "load", SubscribeOnFocusPasswordField);
                return;
            }

            const inputs = document.getElementsByTagName("input");

            for (const input of inputs)
            {
                if (ns.IsStringEqualIgnoreCase(input.type, "password"))
                {
                    input.addEventListener("focus", CallShow);
                    input.addEventListener("blur", () =>
                    {
                        const isClickedWhenBlur = m_balloon.IsClicked();
                        ns.SetTimeout(() => 
                        { 
                            if (!(m_balloon.IsClicked() || isClickedWhenBlur))
                                m_balloon.HideBalloon(); 
                        }, 100);
                    });

                    if (input === document.activeElement)
                    {
                        m_activeElement = input;
                        CallShow();
                    }
                }
            }
        }

        function CallShow()
        {
            m_callFunction("popup_vk_mac.show", { url: ns.StartLocationHref, fromPopup: false });
        }

        function SubscribeWhenMutation()
        {
            if (window.MutationObserver)
            {
                const observer = new MutationObserver(SubscribeOnFocusPasswordField);
                observer.observe(document.getRootNode(), { attributes: true, childList: true, subtree: true });
            }
        }

        function GetPasswordFieldElement()
        {
            const inputs = document.getElementsByTagName("input");
            for (const input of inputs)
            {
                if (input.type.toLowerCase() === "password")
                    return input;
            }
            return null;
        }

        function OnFocusPasswordTextFieldElement()
        {
            m_balloon.OnFocusPasswordTextFieldElement(m_activeElement);
        }

        function OnShow()
        {
            if (m_activeElement !== null)
            {
                OnFocusPasswordTextFieldElement();
            }
            else
            {
                const input = GetPasswordFieldElement();
                if (input)
                {
                    m_activeElement = input;
                    OnFocusPasswordTextFieldElement();
                }
                else
                {
                    m_balloon.ShowBalloon();
                }
            }
        }

        function OnSessionShutdown()
        {
            m_shutdown = true;
            m_observer.unbind();
        }

        function Init()
        {
            session.InitializePlugin((activatePlugin, registerMethod, callFunction) => 
                {
                    m_callFunction = callFunction;
                    activatePlugin("vk_mac", OnPing, null, OnSessionShutdown);
                    registerMethod("vk_mac.show", OnShow);
                    registerMethod("vk_mac.input", OnInput);
                });

            browsersApi.runtime.onMessage.addListener(OnMessage);
            SubscribeOnFocusPasswordField();
            SubscribeWhenMutation();
        }

        function OnMessage(request, sender, sendResponse)
        {
            try
            {
                if (browsersApi.runtime.lastError)
                    ns.SessionLog(`Failed onMessage of vk mac ${browsersApi.runtime.lastError.message}`);

                if (request.command === "vk_mac.getHref" && ns.IsTopLevel)
                    ns.TrySendResponse(sendResponse, { url: ns.StartLocationHref });
            }
            catch (e)
            {
                ns.SessionError(e, "vk_mac");
            }
        }

        function StayFocusedAt(element)
        {
            const pos = element.selectionStart;
            ns.SetTimeout(() => 
            { 
                element.focus();
                element.setSelectionRange(pos, pos);
            }, 100);
        }

        function OnBackspacePressed(element)
        {
            if (element.selectionStart === 0 && element.selectionEnd === 0)
                return false;

            let start = element.value.length;
            let end = element.value.length;

            if (element.selectionStart && element.selectionEnd) 
            {
                start = element.selectionStart;
                end = element.selectionEnd;
            }

            if (end === start)
                start -= 1;

            const lhs = element.value.substring(0, start);
            const rhs = element.value.substring(end, element.value.length);

            element.value = lhs + rhs;
            element.selectionStart = start;
            element.selectionEnd = start;

            return true;
        }

        function FindElement(tag, type)
        {
            const result = document.querySelector(`${tag}[type='${type}']`);
            if (result)
                return result;

            const elementsByTag = document.getElementsByTagName(tag);
            for (const element of elementsByTag)
            {
                if (element.type.toLowerCase() === type)
                    return element;
            }
            return null;
        }

        function OnInputData(element, data)
        {
            if (!element)
                return ns.SessionLog("Key down skip. No active element");
            if (!ns.IsElementVisible(element))
                return ns.SessionLog("Key down skip. Element not visible");

            if (data.key === InputKey.SYMBOL)
            {
                InsertCharacter(element, data.text);
            }
            else if (data.key === InputKey.ENTER)
            {
                if (element.tagName && element.tagName.toLowerCase() === "textarea")
                {
                    InsertCharacter(element, "\n");
                }
                else
                {
                    const submitElement = FindElement("button", "submit") || FindElement("input", "submit");
                    if (submitElement)
                    {
                        submitElement.click();
                    }
                    else
                    {
                        const ke = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, keyCode: 13 });
                        element.dispatchEvent(ke);
                    }
                }
            }
            else if (data.key === InputKey.BACKSPACE)
            {
                if (OnBackspacePressed(element))
                    GenerateInputEvent(element, { bubbles: true, inputType: "deleteContentBackward", cancelable: true });
            }

            StayFocusedAt(element);
        }

        function OnInput(data)
        {
            OnInputData(m_activeElement, data);
        }

        function OnBalloonDataReceived(data)
        {
            const key = KeyMap.has(data.key) ? KeyMap.get(data.key) : InputKey.EMPTY;
            const inputData = { key: key, text: ns.IsDefined(data.text) ? data.text : "" };
            if (m_activeElement)
                OnInputData(m_activeElement, inputData);
            else
                m_callFunction("popup_vk_mac.input", inputData);
        }

        function InsertCharacter(element, character)
        {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            element.value = element.value.substring(0, start) + character + element.value.substring(end);
            element.setSelectionRange(start + character.length, start + character.length);

            GenerateInputEvent(element, { data: character, bubbles: true, inputType: "insertText", cancelable: true });
        }

        function GenerateInputEvent(element, eventData)
        {
            const inputEvent = new InputEvent("input", eventData);
            return element.dispatchEvent(inputEvent);
        }

        function OnElementFocus(element)
        {
            if (m_shutdown)
                return;

            m_activeElement = element;
            m_callFunction("popup_vk_mac.update_focus", { isFocused: true });

            ns.ProtectableElementDetector.ChangeTypeIfNeeded(element);
        }

        function OnElementBlur(element)
        {
            setTimeout(() =>
            {
                if (m_shutdown)
                    return;

                ns.ProtectableElementDetector.RestoreTypeIfNeeded(element);

                if (element !== m_activeElement)
                    return;

                m_activeElement = null;
                m_callFunction("popup_vk_mac.update_focus", { isFocused: false });
            }, 50);
        }

        const m_observer = new ns.FocusChangeObserver(OnElementFocus, OnElementBlur, () => {}, Selectors);

        Init();
    }

    let instance = null;
    ns.RunModule(() =>
    {
        if (!instance)
            instance = new BrowserKeyboard();
    }, 2000);
});
