const mongoose = require('mongoose');

const itemSchema = mongoose.Schema({
    id: Number,
    name: String,
    author_ids: [ Number ],
    created_at: Date,
    updated_at: Date,
    data: Object,
});

module.exports = {
    itemSchema
};