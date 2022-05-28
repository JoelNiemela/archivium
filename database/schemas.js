const mongoose = require('mongoose');

const universeSchema = mongoose.Schema({
    id: Number,
    name: String,
    author_ids: [ Number ],
    created_at: Date,
    updated_at: Date,
});

module.exports = {
    universeSchema
};