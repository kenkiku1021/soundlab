function getCanvas2DContext(ele) {
    var canvas = $(ele)[0];
    if(!canvas || !canvas.getContext) {
	// Canvas not supported
	return false;
    }

    return canvas.getContext("2d");
}
