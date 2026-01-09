
function GetSize()
{
    try
    {
        return {
            width: window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth,
            height: window.innerHeight || window.document.documentElement.clientHeight || window.document.body.clientHeight
        };
    }
    catch (e)
    {
        return { width: 0, height: 0 };
    }
}

function GetFrameInfo()
{
    return GetSize();
}

AvNs.AddRunner("fi", AvNs.EmptyFunc, GetFrameInfo());

