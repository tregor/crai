if (!StructureObserver.prototype._observeRoom) {
    StructureObserver.prototype._observeRoom = StructureObserver.prototype.observeRoom;
    StructureObserver.prototype.observeRoom = function(...args) {
        if (this.observing)
            return ERR_BUSY;
        let observeResult = this._observeRoom.apply(this, args);
        if (observeResult === OK)
            this.observing = args[0]; // Assuming you want to track the room name being observed
        return observeResult;
    };
}
