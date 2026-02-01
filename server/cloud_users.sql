PRAGMA foreign_keys = ON;                       --enable foreign keys

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "users" (
	"id"	INTEGER NOT NULL,
	"email"	TEXT NOT NULL,
	"name"	TEXT,
	"hash"	TEXT NOT NULL,
	"salt"	TEXT NOT NULL,
	"secret" TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);

/*table with all configurations set, modifiable offline*/ 
CREATE TABLE IF NOT EXISTS "configuration" (
    "id" INTEGER PRIMARY KEY CHECK (id = 1), 
    "storage_price_per_tb" REAL DEFAULT 10,     
    
    "transfer_limit_1" INTEGER DEFAULT 10,      
    "transfer_cost_1" REAL DEFAULT 1.0,         
    
    "transfer_limit_2" INTEGER DEFAULT 1000,    
    "transfer_rate_base" REAL DEFAULT 0.1,      
    
    "transfer_factor2" REAL DEFAULT 0.8,   
    "transfer_factor3" REAL DEFAULT 0.5,   

    "min_order_storage" INTEGER DEFAULT 1,
    "min_order_transfer" INTEGER DEFAULT 10,

    "max_total_storage" INTEGER DEFAULT 100,    
    "max_active_instances" INTEGER DEFAULT 6    
);

INSERT OR IGNORE INTO "configuration" ("id") VALUES (1);

/*Classify three types of computation instances*/
CREATE TABLE IF NOT EXISTS "comput_class" (
    "id"            INTEGER NOT NULL,
    "ram_label"     TEXT NOT NULL,
    "ram_size"      INTEGER NOT NULL,
    "m_fee"         REAL NOT NULL,
    "min_stor_req"  INTEGER NOT NULL,          
    PRIMARY KEY("id" AUTOINCREMENT),
    CHECK (id >= 1 AND id <= 3)                 
);

INSERT INTO "comput_class" ("ram_label","ram_size","m_fee","min_stor_req") VALUES
('16 GB RAM',16,10,1),
('32 GB RAM',32,20,10),
('128 GB RAM',128,40,20);

/*Since all the orders must have just one ram, we directly check here the availability*/
CREATE TABLE IF NOT EXISTS "orders" (
    "id"            INTEGER NOT NULL,
    "user_id"       INTEGER NOT NULL,
    "type_ram_id"   INTEGER NOT NULL,
    "storage_tb"    INTEGER NOT NULL,
    "transfer_gb"   INTEGER NOT NULL,
    "total_m_cost"  REAL,
    PRIMARY KEY("id" AUTOINCREMENT),
    FOREIGN KEY("type_ram_id") REFERENCES comput_class("id"),
    FOREIGN KEY("user_id") REFERENCES users("id"),
    CHECK (storage_tb >= 0 AND transfer_gb >= 0)   
);

CREATE TRIGGER check_global_limits_combined
BEFORE INSERT ON orders
BEGIN
    -- 1: Check if both limits are reached
    SELECT RAISE(ABORT, 'Instance limit (6) and storage limit (100TB) both reached.')
    WHERE 
        (SELECT COUNT(*) FROM orders) >= (SELECT max_active_instances FROM configuration WHERE id=1)
        AND 
        (COALESCE((SELECT SUM(storage_tb) FROM orders), 0) + NEW.storage_tb) > (SELECT max_total_storage FROM configuration WHERE id=1);

    -- 2. Check only for instance limitations
    SELECT RAISE(ABORT, 'Global instance limit of 6 reached.')
    WHERE 
        (SELECT COUNT(*) FROM orders) >= (SELECT max_active_instances FROM configuration WHERE id=1);

    -- 3. Check only for storage limitations
    SELECT RAISE(ABORT, 'Global storage limit of 100TB reached.')
    WHERE 
        (COALESCE((SELECT SUM(storage_tb) FROM orders), 0) + NEW.storage_tb) > (SELECT max_total_storage FROM configuration WHERE id=1);
END;

/*Check contraints on minimal storage amount per type of ram*/
CREATE TRIGGER IF NOT EXISTS check_min_storage_for_ram
BEFORE INSERT ON orders
BEGIN
    SELECT RAISE(ABORT, 'Not enough storage for this RAM type')
    WHERE NEW.storage_tb < (SELECT min_stor_req FROM comput_class WHERE id = NEW.type_ram_id);
END;

CREATE TRIGGER IF NOT EXISTS check_min_order_values
BEFORE INSERT ON orders
BEGIN
    -- Check minimum amount of storage
    SELECT RAISE(ABORT, 'Storage amount is below the allowed minimum')
    WHERE NEW.storage_tb < (SELECT min_order_storage FROM configuration WHERE id=1);

    -- Check minimum amount of transfer 
    SELECT RAISE(ABORT, 'Transfer amount is below the allowed minimum')
    WHERE NEW.transfer_gb < (SELECT min_order_transfer FROM configuration WHERE id=1);
END;

/*Calculate total cost*/
CREATE TRIGGER IF NOT EXISTS calculate_total_cost
AFTER INSERT ON orders
BEGIN
    UPDATE orders
    SET total_m_cost = (
        -- RAM (fixed)
        (SELECT m_fee FROM comput_class WHERE id = NEW.type_ram_id) 
        -- storage (fixed fee)
        +(NEW.storage_tb * (SELECT storage_price_per_tb FROM configuration WHERE id = 1))
        -- data transfer: 1050 GB: b = 1 GB, a1 = 1000-10, a2 = 1050-1000 -> cost = 1 + (a1*0.01*0.8) + (a2*0.01*0.5)
        +(
            SELECT 
                CASE 
                    WHEN NEW.transfer_gb = transfer_limit_1 THEN 
                        transfer_cost_1
                    -- If transfer_gb between 11GB e 1000GB
                    WHEN NEW.transfer_gb <= transfer_limit_2 THEN 
                        transfer_cost_1 + 
                        ( (NEW.transfer_gb - transfer_limit_1) * (transfer_rate_base * transfer_factor2) )
                    -- Above 1000GB
                    ELSE 
                        transfer_cost_1 + 
                        ( (transfer_limit_2 - transfer_limit_1) * (transfer_rate_base * transfer_factor2) ) +
                        ( (NEW.transfer_gb - transfer_limit_2) * (transfer_rate_base * transfer_factor3) )
                END
            FROM configuration WHERE id = 1
        )
    )
    WHERE id = NEW.id;
END;

/*Filling tables*/
INSERT INTO "users" ("email", "name", "hash", "salt", "secret") VALUES 
('u1@p.it','Matteo','382e0b611be6cddb2fe9038636a13ad333397d59f8c50bfda10e1faf46a85f1e','72e4eeb14def3b21','LXBSMDTMSP2I5XFXIYRGFVWSFI'), --password: polito
('u2@p.it','Salvo','27ca950a0811defb1de7622192e24ff2d031b827d6085014919dd300ea97b29a','a8b618c717683608',''), --password: catania02
('u3@p.it','Gianmarco','a05564bf0c6e1c6baedf393048c26c68c5a8365f0a455a2fa4e4d3eb5924a143','e818f0647b4e1fe0','LXBSMDTMSP2I5XFXIYRGFVWSFI'), --password: emily5
('u4@p.it','Antonio','122f3d63013a67abab5b00e3f1248cd7c48944beead96c1e193ea34661916a0d','4ea8022e47298db8','LXBSMDTMSP2I5XFXIYRGFVWSFI'); --password: bari02

INSERT INTO "orders" ("user_id","type_ram_id","storage_tb","transfer_gb") VALUES
(2,2,10,10),
(2,3,25,50),
(3,2,15,100),
(3,3,20,100);


COMMIT;