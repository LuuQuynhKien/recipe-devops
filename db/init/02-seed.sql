SET NAMES utf8mb4;

INSERT INTO categories (name) VALUES
  ('Món nước'), ('Món cuốn & ăn nhẹ'), ('Món chính'), ('Món canh'), ('Tráng miệng');

INSERT INTO recipes (id, title, description, instructions, category_id) VALUES
(1, 'Phở bò Hà Nội', 'Nước dùng trong, ngọt thanh từ xương bò và gia vị nướng.',
 'Chần xương bò qua nước sôi rồi rửa sạch.\nNướng hành, gừng, hồi, quế, thảo quả cho thơm.\nHầm xương với gia vị 3-4 tiếng, nêm nước mắm và muối.\nTrụng bánh phở, xếp thịt bò thái mỏng, chan nước dùng nóng.\nThêm hành lá, rau thơm, chanh, ớt.', 1),
(2, 'Bún chả', 'Chả nướng than hoa ăn kèm bún, rau sống và nước chấm chua ngọt.',
 'Ướp thịt ba chỉ và thịt xay với hành tím, nước mắm, đường, tiêu 1 tiếng.\nVo viên chả, kẹp thịt ba chỉ rồi nướng vàng đều hai mặt.\nPha nước chấm: nước mắm, đường, giấm, tỏi, ớt, nước ấm.\nThả chả vào nước chấm, dọn kèm bún và rau sống.', 3),
(3, 'Gỏi cuốn tôm thịt', 'Món cuốn thanh mát với tôm, thịt luộc, bún và rau thơm.',
 'Luộc tôm và thịt ba chỉ, thái mỏng.\nNhúng nhanh bánh tráng qua nước ấm.\nXếp rau, bún, thịt, tôm lên bánh tráng rồi cuốn chặt tay.\nPha nước chấm tương đậu phộng và ăn kèm.', 2),
(4, 'Canh chua cá lóc', 'Canh chua miền Tây với me, dứa, cà chua và rau ngổ.',
 'Nấu nước me, lọc bỏ xác.\nThêm cà chua, dứa, đậu bắp, bạc hà vào nồi.\nCho cá lóc vào nấu chín, nêm nước mắm, đường.\nThêm rau ngổ, ngò gai, tỏi phi trước khi tắt bếp.', 4),
(5, 'Chè đậu xanh', 'Chè đậu xanh đánh nhuyễn, ngọt dịu, ăn nóng hoặc lạnh.',
 'Ngâm đậu xanh 2 tiếng rồi vo sạch.\nHấp hoặc nấu đậu mềm nhừ, đánh nhuyễn.\nCho đường vào nấu nhỏ lửa, khuấy đều.\nThêm nước cốt dừa và dọn ăn.', 5);

INSERT INTO ingredients (recipe_id, name, quantity) VALUES
(1, 'Xương bò', '1.5 kg'), (1, 'Thịt bò thái mỏng', '300 g'), (1, 'Bánh phở', '500 g'),
(1, 'Hành tím, gừng nướng', '100 g'), (1, 'Hồi, quế, thảo quả', '1 nắm nhỏ'),
(2, 'Thịt ba chỉ', '400 g'), (2, 'Thịt xay', '300 g'), (2, 'Bún tươi', '500 g'),
(2, 'Nước mắm', '4 muỗng canh'), (2, 'Rau sống', '1 rổ'),
(3, 'Tôm', '300 g'), (3, 'Thịt ba chỉ', '200 g'), (3, 'Bánh tráng', '15 tờ'), (3, 'Bún', '200 g'), (3, 'Rau thơm', '1 bó'),
(4, 'Cá lóc', '500 g'), (4, 'Me chua', '50 g'), (4, 'Cà chua', '2 quả'), (4, 'Dứa', '1/4 quả'), (4, 'Đậu bắp', '4 quả'),
(5, 'Đậu xanh cà', '200 g'), (5, 'Đường cát', '120 g'), (5, 'Nước cốt dừa', '100 ml');
