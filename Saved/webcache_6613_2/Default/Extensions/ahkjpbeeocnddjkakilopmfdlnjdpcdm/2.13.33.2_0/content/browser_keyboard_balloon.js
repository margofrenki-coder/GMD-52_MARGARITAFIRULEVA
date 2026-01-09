(ns =>
{
    ns.BrowserKeyboardBalloon = function BrowserKeyboardBalloon(session, locales, onBalloonDataReceiveHandler)
    {
        const m_balloon = new ns.Balloon2(
            "vk_mac",
            "/vk/browser_keyboard_balloon.html",
            "/vk_mac/balloon.css",
            session,
            GetCoordsCallback,
            OnCloseHandler,
            locales,
            OnDataReceiveHandler
        );

        let m_balloonX = 0;
        let m_balloonY = 0;
        let m_balloonWidth = 0;
        let m_balloonHeight = 0;
        let m_pageMouseX = 0;
        let m_pageMouseY = 0;
        let m_isAlreadyAppeared = false;
        let m_isDrag = false;
        let m_isButtonPressed = false;
        let m_firstAppearanceHandler = ns.EmptyFunc;
        let m_shownForElement = null;

        function GetCoordsCallback() 
        {
            const coord = { x: m_balloonX, y: m_balloonY };
            return coord;
        }

        function OnCloseHandler(arg)
        {
            if (arg === 0)
                m_balloon.Hide();
        }

        function OnDragStart(mouseX, mouseY) 
        {
            m_isDrag = true;
            m_pageMouseX = m_balloonX + mouseX;
            m_pageMouseY = m_balloonY + mouseY;

            document.addEventListener("mouseup", OnDragEnd);
            document.addEventListener("mousemove", OnPageMouseMove);
        }

        function OnDragEnd() 
        {
            document.removeEventListener("mouseup", OnDragEnd);
            document.removeEventListener("mousemove", OnPageMouseMove);
            m_isDrag = false;
        }

        function OnDrag(offsetX, offsetY) 
        {
            m_balloonX += offsetX;
            m_balloonY += offsetY;

            m_balloon.LightUpdatePosition(m_balloonX, m_balloonY);

            m_pageMouseX += offsetX;
            m_pageMouseY += offsetY;
        }

        function OnPageMouseMove(event) 
        {
            m_balloonX += event.clientX - m_pageMouseX;
            m_balloonY += event.clientY - m_pageMouseY;

            m_balloon.LightUpdatePosition(m_balloonX, m_balloonY);

            m_pageMouseX = event.clientX;
            m_pageMouseY = event.clientY;
        }

        function OnDataReceiveHandler(data)
        {
            switch (data.msg) 
            {
                case "vk.pressedKey":
                    m_isButtonPressed = true;
                    onBalloonDataReceiveHandler(data);
                    break;
                case "vk.releasedKey":
                    m_isButtonPressed = false;
                    break;
                case "vk.dragStart":
                    OnDragStart(data.mouseX, data.mouseY);
                    break;
                case "vk.drag":
                    OnDrag(data.offsetX, data.offsetY);
                    break;
                case "vk.dragEnd":
                    OnDragEnd();
                    break;
                case "vk.created":
                    m_balloonWidth = data.width;
                    m_balloonHeight = data.height;
                    m_firstAppearanceHandler();
                    break;
                default:
                    break;
            }
        }

        this.IsClicked = () => m_isDrag || m_isButtonPressed;

        this.HideBalloon = () => { m_balloon.Hide(); };

        function HasIntersectionsWithWindowBorders()
        {
            return (m_balloonX < 0 || (m_balloonX + m_balloonWidth > window.innerWidth)
                || m_balloonY < 0 || m_balloonY + m_balloonHeight > window.innerHeight);
        }

        function MoveAfterFocusPasswordFieldElement(element)
        {
            const passwordField = element.getBoundingClientRect();
            return () =>
            {
                m_balloonX = passwordField.x + (passwordField.width / 2) - (m_balloonWidth / 2);
                if (m_balloonX < 0)
                    m_balloonX = 0;
                else if (m_balloonX + m_balloonWidth > window.innerWidth)
                    m_balloonX = window.innerWidth - m_balloonWidth;

                m_balloonY = passwordField.y + passwordField.height;
                m_balloon.LightUpdatePosition(m_balloonX, m_balloonY);
            };
        }

        function MoveAfterPopupVkOpenClicked()
        {
            m_balloonX = (window.innerWidth / 2) - (m_balloonWidth / 2);
            m_balloonY = window.innerHeight - m_balloonHeight;
            m_balloon.LightUpdatePosition(m_balloonX, m_balloonY);
        }

        function HasIntersectionWith(element)
        {
            const rect = element.getBoundingClientRect();
            return !(m_balloonX > rect.right || (m_balloonX + m_balloonWidth < rect.x)
                || m_balloonY > rect.bottom || (m_balloonY + m_balloonHeight) < rect.y);
        }

        function Show(handler, activeElement)
        {
            if (m_isAlreadyAppeared)
            {
                if (activeElement)
                {
                    if (HasIntersectionWith(activeElement))
                        MoveAfterFocusPasswordFieldElement(activeElement)();
                }
                else if (HasIntersectionsWithWindowBorders())
                {
                    MoveAfterPopupVkOpenClicked();
                }
            }
            else
            {
                m_firstAppearanceHandler = handler;
                m_isAlreadyAppeared = true;
            }
            m_shownForElement = activeElement;
            m_balloon.Show("", {});
        }

        this.OnFocusPasswordTextFieldElement = element =>
        {
            Show(MoveAfterFocusPasswordFieldElement(element), element);
        };

        this.ShowBalloon = () => { Show(MoveAfterPopupVkOpenClicked, null); };

        this.ShownForElement = () => m_shownForElement;
    };

})(AvNs);
