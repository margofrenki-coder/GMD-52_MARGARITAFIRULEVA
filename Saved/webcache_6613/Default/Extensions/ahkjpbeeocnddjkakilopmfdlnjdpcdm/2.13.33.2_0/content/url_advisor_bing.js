function GetSearchLinks()
{
    try
    {
        var links = document.querySelectorAll(
            ".b_algo > h2 > a, .b_algo > div> div > h2 > a, .b_algo > div> h2 > a, .sb_tlst > h2 > a, .b_algo > .b_title > h2 > a, .b_algo > div > div > .b_title > h2 > a"
        );
        var results = [];
        for (var i = 0; i < links.length; ++i)
        {
            try
            {
                var linkElement = links[i];
                var hrefElement = linkElement.parentElement.parentElement.querySelector(".mc_vtvc_link");
                if (hrefElement && hrefElement.href)
                    results.push({ element: linkElement, href: hrefElement.href });
                else
                    results.push({ element: linkElement, href: linkElement.href });
            }
            catch (e)
            {
                AvNs.SessionLog(e);
            }
        }
        return results;
    }
    catch (e)
    {
        AvNs.SessionError(e, "ua");
        return [];
    }
}

AvNs.GetSearchLinks = GetSearchLinks;

