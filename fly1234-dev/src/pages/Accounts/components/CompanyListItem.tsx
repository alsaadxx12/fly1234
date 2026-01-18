@@ .. @@
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => props.onViewVoucher(voucher.id)}
                              className="p-1 text-gray-600 hover:text-indigo-600 transition-colors"
                              title={t('view')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!props.readOnlyMode && (
                            <button
                              onClick={() => props.onEditVoucher(voucher.id)}
                              className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                              title={t('edit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                           )}
                            <button
                              onClick={() => handlePrintVoucher(voucher)}
                              className="p-1 text-gray-600 hover:text-purple-600 transition-colors"
                              title={t('print')}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                           {!props.readOnlyMode && (
                            <button
                              onClick={() => props.onDeleteVoucher(voucher.id)}
                              className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                           )}
                          </div>
                        </div>
                      </div>