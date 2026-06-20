'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tag extends Model {
    static associate(models) {
      Tag.belongsToMany(models.Deck, { through: models.DeckTag, foreignKey: 'tagId', otherKey: 'deckId', as: 'decks' });
    }
  }
  Tag.init({
    name: { type: DataTypes.STRING, allowNull: false, unique: true }
  }, {
    sequelize,
    modelName: 'Tag',
    tableName: 'Tags'
  });
  return Tag;
};
