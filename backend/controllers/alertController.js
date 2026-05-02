import Alert from "../models/Alert.js";

export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find()
      .populate({
        path: "transaction",
        match: { user: req.user._id }
      })
      .sort({ createdAt: -1 });

    res.json(alerts.filter((alert) => alert.transaction));
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id).populate("transaction");

    if (!alert || !alert.transaction) {
      res.status(404);
      throw new Error("Alert not found");
    }

    if (String(alert.transaction.user) !== String(req.user._id)) {
      res.status(403);
      throw new Error("Not authorized to resolve this alert");
    }

    alert.resolved = true;
    await alert.save();

    res.json(alert);
  } catch (error) {
    next(error);
  }
};
