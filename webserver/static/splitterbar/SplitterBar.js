(function($) {

    // We should take in an argument for endDrag
    $.fn.SplitterBar = function() {
        let leftSide = $(this).children('.left-splitpane').first();
        let rightSide = $(this).children('.right-splitpane').first();
        let splitterBar = $(this).children('.splitter-bar').first();
        let isDragging = false;

        splitterBar.mousedown((event) => {
            isDragging = true;
            return false;
        });

        // splitterBar.mouseup((event) => {
        //     isDragging = false;
        //     return false;
        // });

        // It is safer to do mouse up on whole pane and not just the splitter
        $(this).mouseup((event) => {
            isDragging = false;
            return false;
        });

        $(this).mousemove((event) => {
            if(isDragging) {
                let leftOfLeft = leftSide.position().left;
                leftSide.width(event.pageX - leftOfLeft - splitterBar.width() / 2);
            }
        });
    }
}(jQuery));