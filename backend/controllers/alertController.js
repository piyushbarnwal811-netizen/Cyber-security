import Alert from "../models/Alert.js";

export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find()
      .populate("transaction")
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );

    if (!alert) {
      res.status(404);
      throw new Error("Alert not found");
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
};
