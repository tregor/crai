if (!StructureObserver.prototype._observeRoom) {
    StructureObserver.prototype._observeRoom = StructureObserver.prototype.observeRoom;
    StructureObserver.prototype.observeRoom = function(...arguments) {
        if (this.observing) 
            return ERR_BUSY;
        let observeResult = this._observeRoom.apply(this, arguments);
        if (observeResult === OK)
            this.observing = roomName;
        return observeResult;
    };
}