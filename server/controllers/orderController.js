const Order = require('../models/Order');
const Shipment = require('../models/Shipment');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (ADMIN, NGO)
exports.createOrder = async (req, res, next) => {
  try {
    let {
      customerName,
      contactInfo,
      pickupLocation,
      deliveryLocation,
      cargoDescription,
      cargo,
      quantity,
      weight,
      priority,
      requestedDeliveryDate,
      requiredDeliveryDate,
      specialInstructions,
    } = req.body;

    // Handle field aliases
    const finalCargo = cargoDescription || cargo;
    const finalDate = requestedDeliveryDate || requiredDeliveryDate;
    const finalCustomer = customerName || (req.user ? req.user.name : '') || 'NGO Request';
    const finalWeight = weight ? parseFloat(weight) : (parseFloat(quantity) || 1);

    // Format pickup location
    let finalPickup = pickupLocation;
    if (typeof pickupLocation === 'string') {
      finalPickup = {
        locationName: pickupLocation,
        address: pickupLocation,
      };
    }

    // Format delivery location
    let finalDelivery = deliveryLocation;
    if (typeof deliveryLocation === 'string') {
      finalDelivery = {
        locationName: deliveryLocation,
        address: deliveryLocation,
      };
    }

    // Build cargo description with optional instructions
    let detailedCargo = finalCargo;
    if (specialInstructions && detailedCargo && !detailedCargo.includes(specialInstructions)) {
      detailedCargo = `${detailedCargo} (Instructions: ${specialInstructions})`;
    }

    if (
      !finalCustomer ||
      !finalPickup ||
      !finalPickup.locationName ||
      !finalDelivery ||
      !finalDelivery.locationName ||
      !detailedCargo ||
      !quantity ||
      !finalDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Cargo, Quantity, Pickup Location, Delivery Target, and Delivery Date.',
      });
    }

    const order = await Order.create({
      customerName: finalCustomer,
      contactInfo: contactInfo || '',
      pickupLocation: finalPickup,
      deliveryLocation: finalDelivery,
      cargoDescription: detailedCargo,
      quantity: parseFloat(quantity),
      weight: finalWeight,
      priority: priority ? priority.toUpperCase() : 'MEDIUM',
      requestedDeliveryDate: new Date(finalDate),
      createdBy: req.user._id || req.user.id,
      status: 'PENDING',
    });

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'ORDER_CREATED',
        module: 'ORDERS',
        referenceId: order.orderId || order._id.toString(),
        description: `Order created for ${order.customerName} (${order.cargoDescription}, ${order.quantity} units)`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[orderController] Audit error:', audErr.message);
    }

    try {
      const { notifyRole } = require('../services/notificationService');
      const ngoName = req.user ? req.user.name : (order.customerName || 'NGO Request');
      const orderRef = order.orderId || ('ORD-' + order._id.toString().slice(-6).toUpperCase());
      await notifyRole('ADMIN', {
        title: 'New Order Request',
        message: `NGO ${ngoName} submitted a new order request ${orderRef}.`,
        category: 'ORDER',
        severity: 'MEDIUM',
        relatedEntityType: 'Order',
        relatedEntityId: order._id
      });
    } catch (notifErr) {
      console.error('[orderController] Error creating Admin notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Order request submitted successfully.',
      data: order,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get orders list
// @route   GET /api/orders
// @access  Private (Authenticated users)
exports.getOrders = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === 'NGO') {
      query.createdBy = req.user._id;
    }

    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.priority) {
      query.priority = req.query.priority.toUpperCase();
    }
    if (req.query.assignedShipment) {
      query.assignedShipment = req.query.assignedShipment;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const searchOr = [
        { orderId: searchRegex },
        { customerName: searchRegex },
        { cargoDescription: searchRegex },
        { 'pickupLocation.locationName': searchRegex },
        { 'deliveryLocation.locationName': searchRegex },
      ];
      if (query.createdBy) {
        query.$and = [{ createdBy: query.createdBy }, { $or: searchOr }];
        delete query.createdBy;
      } else {
        query.$or = searchOr;
      }
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedShipment', 'shipmentId status')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private (Authenticated users)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedShipment')
      .populate('statusHistory.changedBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (req.user.role === 'NGO' && order.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    next(error);
  }
};

// @desc    Update order details
// @route   PUT /api/orders/:id
// @access  Private (ADMIN)
exports.updateOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      contactInfo,
      pickupLocation,
      deliveryLocation,
      cargoDescription,
      quantity,
      weight,
      priority,
      requestedDeliveryDate,
      assignedShipment,
      status,
    } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const updates = {};
    if (customerName) updates.customerName = customerName;
    if (contactInfo !== undefined) updates.contactInfo = contactInfo;
    if (cargoDescription) updates.cargoDescription = cargoDescription;
    if (quantity !== undefined) updates.quantity = parseFloat(quantity);
    if (weight !== undefined) updates.weight = parseFloat(weight);
    if (priority) updates.priority = priority;
    if (requestedDeliveryDate) updates.requestedDeliveryDate = new Date(requestedDeliveryDate);

    if (pickupLocation) {
      if (pickupLocation.locationName) updates['pickupLocation.locationName'] = pickupLocation.locationName;
      if (pickupLocation.address !== undefined) updates['pickupLocation.address'] = pickupLocation.address;
      if (pickupLocation.latitude !== undefined) updates['pickupLocation.latitude'] = pickupLocation.latitude;
      if (pickupLocation.longitude !== undefined) updates['pickupLocation.longitude'] = pickupLocation.longitude;
    }

    if (deliveryLocation) {
      if (deliveryLocation.locationName) updates['deliveryLocation.locationName'] = deliveryLocation.locationName;
      if (deliveryLocation.address !== undefined) updates['deliveryLocation.address'] = deliveryLocation.address;
      if (deliveryLocation.latitude !== undefined) updates['deliveryLocation.latitude'] = deliveryLocation.latitude;
      if (deliveryLocation.longitude !== undefined) updates['deliveryLocation.longitude'] = deliveryLocation.longitude;
    }

    if (assignedShipment !== undefined) {
      if (assignedShipment === '' || assignedShipment === null) {
        updates.assignedShipment = null;
        if (order.status === 'ASSIGNED') {
          updates.status = 'CONFIRMED';
          updates.$push = {
            statusHistory: {
              status: 'CONFIRMED',
              timestamp: new Date(),
              changedBy: req.user.id,
            },
          };
        }
      } else {
        const shipment = await Shipment.findById(assignedShipment);
        if (!shipment) {
          return res.status(400).json({
            success: false,
            message: 'Target assigned shipment not found.',
          });
        }
        updates.assignedShipment = assignedShipment;
        
        if (['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
          updates.status = 'ASSIGNED';
          updates.$push = {
            statusHistory: {
              status: 'ASSIGNED',
              timestamp: new Date(),
              changedBy: req.user.id,
            },
          };
        }
      }
    }

    if (status && status !== order.status) {
      updates.status = status;
      const historyEntry = {
        status: status,
        timestamp: new Date(),
        changedBy: req.user.id,
      };
      if (updates.$push) {
        updates.$push.statusHistory = historyEntry;
      } else {
        updates.$push = { statusHistory: historyEntry };
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedShipment', 'shipmentId status');

    if (updatedOrder && updatedOrder.createdBy && status && status !== order.status) {
      try {
        const { notifyUser } = require('../services/notificationService');
        const isApproval = ['CONFIRMED', 'PROCESSING', 'ASSIGNED'].includes(status);
        const isRejection = ['REJECTED', 'CANCELLED'].includes(status);
        const orderRef = updatedOrder.orderId || ('ORD-' + updatedOrder._id.toString().slice(-6).toUpperCase());

        const title = isApproval ? 'Order Approved' : isRejection ? 'Order Rejected' : `Order Status: ${status}`;
        const message = isApproval
          ? `Order ${orderRef} has been approved by Admin.`
          : isRejection
          ? `Order ${orderRef} has been ${status.toLowerCase()} by Admin.`
          : `Order ${orderRef} status updated to ${status}.`;

        await notifyUser(updatedOrder.createdBy._id || updatedOrder.createdBy, {
          title,
          message,
          category: 'ORDER',
          severity: isRejection ? 'HIGH' : 'MEDIUM',
          relatedEntityType: 'Order',
          relatedEntityId: updatedOrder._id
        });
      } catch (nErr) {
        console.error('[orderController] Error notifying NGO of order update:', nErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (ADMIN)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status.',
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.status = status;
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      changedBy: req.user.id,
    });

    await order.save();

    if (order.createdBy) {
      try {
        const { notifyUser } = require('../services/notificationService');
        const isApproval = ['CONFIRMED', 'PROCESSING', 'ASSIGNED'].includes(status);
        const isRejection = ['REJECTED', 'CANCELLED'].includes(status);
        const orderRef = order.orderId || ('ORD-' + order._id.toString().slice(-6).toUpperCase());

        const title = isApproval ? 'Order Approved' : isRejection ? 'Order Rejected' : `Order Status: ${status}`;
        const message = isApproval
          ? `Order ${orderRef} has been approved by Admin.`
          : isRejection
          ? `Order ${orderRef} has been ${status.toLowerCase()} by Admin.`
          : `Order ${orderRef} status updated to ${status}.`;

        await notifyUser(order.createdBy._id || order.createdBy, {
          title,
          message,
          category: 'ORDER',
          severity: isRejection ? 'HIGH' : 'MEDIUM',
          relatedEntityType: 'Order',
          relatedEntityId: order._id
        });
      } catch (nErr) {
        console.error('[orderController] Error notifying NGO of order status patch:', nErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (ADMIN)
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    next(error);
  }
};
